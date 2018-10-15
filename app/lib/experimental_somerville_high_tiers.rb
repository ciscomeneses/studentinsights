# This class is for expressing the different tiers
# of support that students should be receiving, to help
# educators catch and verify that students are getting
# the level of support and service they need.
#
# This is at experimental prototype quality.
class ExperimentalSomervilleHighTiers
  FAILING_GRADE = 65

  def initialize(educator, options = {})
    @educator = educator
    @authorizer = Authorizer.new(@educator)
    @time_interval = options.fetch(:time_interval, 45.days)

    if !PerDistrict.new.enabled_high_school_tiering?
      raise 'not enabled: PerDistrict.new.enabled_high_school_tiering?'
    end
  end

  def students_with_tiering_json(school_ids, time_now)
    cutoff_time = time_now - @time_interval

    # query for students, enforce authorization
    students = @authorizer.authorized do
      Student.active
        .where(school_id: school_ids)
        .to_a # because of AuthorizedDispatcher#filter_relation
    end
    student_ids = students.map(&:id)

    # query for absences and discipline events in batch
    absence_counts_by_student_id = Absence
      .where(student_id: student_ids)
      .where('occurred_at >= ?', cutoff_time)
      .group(:student_id)
      .count
    discipline_incident_counts_by_student_id = DisciplineIncident
      .where(student_id: student_ids)
      .where('occurred_at >= ?', cutoff_time)
      .group(:student_id)
      .count

    # query for sections within the current term
    section_ids = Section
      .where(term_local_id: current_term_local_ids(time_now))
      .pluck(:id)
    student_section_assignments_by_student_id = StudentSectionAssignment
      .includes(section: :course)
      .where(student_id: student_ids)
      .where(section_id: section_ids)
      .group_by(&:student_id)

    # Compute tiers for each student, with some querying in here still
    tiers_by_student_id = {}
    students.each do |student|
      query_results_for_student = {
        absences_count_in_period: absence_counts_by_student_id.fetch(student.id, 0),
        discipline_incident_count_in_period: discipline_incident_counts_by_student_id.fetch(student.id, 0),
        section_assignments_right_now: student_section_assignments_by_student_id.fetch(student.id, [])
      }
      tiering_data = calculate_tiering_data(query_results_for_student, @time_interval)
      puts 'tiering_data'
      puts tiering_data.inspect
      tiers_by_student_id[student.id] = ShsTiers.new.decide_tier(tiering_data)
    end

    # Optimized batch query for latest event_notes
    notes_by_student_id = most_recent_event_notes_by_student_id(student_ids, cutoff_time, {
      last_sst_note: [300],
      last_experience_note: [305, 306, 307]
    })

    # Serialize student fields
    students_json = students.as_json(only: [
      :id,
      :first_name,
      :last_name,
      :grade,
      :limited_english_proficiency,
      :house,
      :sped_placement,
      :program_assigned
    ])

    # Merge it all back together
    students_with_tiering = students_json.map do |student_json|
      student_id = student_json['id']
      student_section_assignments_right_now = student_section_assignments_by_student_id.fetch(student_id, [])
      student_json.merge({
        tier: tiers_by_student_id[student_id],
        notes: notes_by_student_id[student_id],
        student_section_assignments_right_now: student_section_assignments_right_now.as_json({
          only: [:id, :grade_letter, :grade_numeric],
          include: {
            section: {
              only: [:id, :section_number],
              methods: [:course_description]
            }
          }
        })
      })
    end
    students_with_tiering.as_json
  end

  private
  # query_map is {:result_key => [event_note_type_id]}
  def most_recent_event_notes_by_student_id(student_ids, cutoff_time, query_map)
    notes_by_student_id = {}

    # query across all students and note types
    all_event_note_type_ids = query_map.values.flatten.uniq
    partial_event_notes = EventNote
      .where(student_id: student_ids)
      .where('recorded_at >= ?', cutoff_time)
      .where(event_note_type_id: all_event_note_type_ids)
      .where(is_restricted: false)
      .select('student_id, event_note_type_id, max(recorded_at) as most_recent_recorded_at')
      .group(:student_id, :event_note_type_id)

    # merge them together and serialize
    sorted_partial_event_notes = partial_event_notes.sort_by(&:most_recent_recorded_at).reverse
    student_ids.each do |student_id|
      notes_for_student = {}
      query_map.each do |key, event_note_type_ids|
        # find the most recent note for this kind, we can use find because the list is sorted
        matching_partial_note = sorted_partial_event_notes.find do |partial_event_note|
          matches_student_id = partial_event_note.student_id == student_id
          matches_event_note_type_id = event_note_type_ids.include?(partial_event_note.event_note_type_id)
          matches_student_id && matches_event_note_type_id
        end

        # serialize notes for a student
        if matching_partial_note.nil?
          notes_for_student[key] = {}
        else
          notes_for_student[key] = {
            # TODO(kr) maybe need id here?
            event_note_type_id: matching_partial_note.event_note_type_id,
            recorded_at: matching_partial_note.most_recent_recorded_at
          }
        end
      end
      notes_for_student[:last_other_note] = {} # TODO(kr) remove
      notes_by_student_id[student_id] = notes_for_student
    end
    notes_by_student_id
  end

  def course_failures(section_assignments_right_now, options = {})
    assignments = section_assignments_right_now.select do |assignment|
      grade_numeric = assignment.grade_numeric
      grade_numeric.present? && grade_numeric < FAILING_GRADE
    end
    assignments.size
  end

  def course_ds(section_assignments_right_now, options = {})
    assignments = section_assignments_right_now.select do |assignment|
      grade_numeric = assignment.grade_numeric
      grade_numeric.present? && grade_numeric > FAILING_GRADE && grade_numeric <= 69
    end
    assignments.size
  end

  # This uses a super rough heuristic for school days.
  def recent_absence_rate(absences_count_in_period, time_interval)
    total_days = time_interval / 1.day
    school_days = (total_days * 5/7).round
    (school_days - absences_count_in_period) / school_days.to_f
  end

  # This doesn't actually check actions for discipline; it only looks at
  # events since we don't have actions from Aspen yet.
  def calculate_tiering_data(query_results_for_student, time_interval)
    absences_count_in_period = query_results_for_student.fetch(:absences_count_in_period)
    discipline_incident_count_in_period = query_results_for_student.fetch(:discipline_incident_count_in_period)
    section_assignments_right_now = query_results_for_student.fetch(:section_assignments_right_now)
    ::ShsTiers::TieringInputs.new({
      course_failures: course_failures(section_assignments_right_now),
      course_ds: course_ds(section_assignments_right_now),
      recent_absence_rate: recent_absence_rate(absences_count_in_period, time_interval),
      recent_discipline_actions: discipline_incident_count_in_period
    })
  end

  def current_term_local_ids(time_now)
    current_quarter = PerDistrict.new.current_quarter(time_now)
    return ['Q1', 'S1', '1', '9', 'FY'] if current_quarter == 'Q1'
    return ['Q2', 'S1', '1', '9', 'FY'] if current_quarter == 'Q2'
    return ['Q3', 'S2', '2', '9', 'FY'] if current_quarter == 'Q3'
    return ['Q4', 'S2', '2', '9', 'FY'] if current_quarter == 'Q4'
    []
  end
end
