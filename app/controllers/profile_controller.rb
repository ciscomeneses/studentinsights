class ProfileController < ApplicationController
  include ApplicationHelper

  before_action :authorize!

  def json
    student = Student.find(params[:id])
    chart_data = StudentProfileChart.new(student).chart_data

    render json: {
      current_educator: current_educator.as_json(methods: [:labels]),
      student: serialize_student_for_profile(student),          # School homeroom, most recent school year attendance/discipline counts
      feed: student_feed(student),
      chart_data: chart_data,                                   # STAR, MCAS, discipline, attendance charts
      dibels: student.dibels_results.as_json(only: [:id, :date_taken, :benchmark]),
      f_and_p_assessments: student.f_and_p_assessments.as_json(only: [:id, :benchmark_date, :instructional_level, :f_and_p_code]),
      service_types_index: ServiceSerializer.service_types_index,
      educators_index: Educator.to_index,
      access: student.access,
      teams: ENV.fetch('SHOULD_SHOW_TEAM_ICONS', false) ? student.teams.as_json(only: [:activity_text, :coach_text]) : [],
      profile_insights: ProfileInsights.new(student).as_json,
      latest_iep_document: student.latest_iep_document.as_json(only: [:id]),
      sections: serialize_student_sections_for_profile(student),
      current_educator_allowed_sections: current_educator.allowed_sections.map(&:id),
      attendance_data: {
        discipline_incidents: discipline_incidents_as_json(student),
        tardies: filtered_events(student.tardies),
        absences: filtered_events(student.absences)
      }
    }
  end

  private
  def authorize!
    student = Student.find(params[:id])
    raise Exceptions::EducatorNotAuthorized unless current_educator.is_authorized_for_student(student)
  end

  def serialize_student_for_profile(student)
    # These are serialized, even if importing these is disabled
    # and the value is nil.
    per_district_fields = {
      house: student.house,
      counselor: student.counselor,
      sped_liaison: student.sped_liaison,
      ell_entry_date: student.ell_entry_date,
      ell_transition_date: student.ell_transition_date
    }

    student.as_json.merge(per_district_fields).merge({
      has_photo: (student.student_photos.size > 0),
      absences_count: student.most_recent_school_year_absences_count,
      tardies_count: student.most_recent_school_year_tardies_count,
      school_local_id: student.try(:school).try(:local_id),
      school_name: student.try(:school).try(:name),
      school_type: student.try(:school).try(:school_type),
      homeroom_name: student.try(:homeroom).try(:name),
      discipline_incidents_count: student.most_recent_school_year_discipline_incidents_count
    }).stringify_keys
  end

  # Include all courses, not just in the current term.
  def serialize_student_sections_for_profile(student)
    student.sections.select('sections.*, student_section_assignments.grade_numeric').as_json({
      include: {
        educators: {only: :full_name}
      },
      methods: :course_description
    })
  end

  def student_feed(student)
    {
      event_notes: student.event_notes
        .map {|event_note| EventNoteSerializer.safe(event_note).serialize_event_note },
      transition_notes: student.transition_notes,
      homework_help_sessions: student.homework_help_sessions.as_json(except: [:course_ids], methods: [:courses]),
      services: {
        active: student.services.active.map {|service| ServiceSerializer.new(service).serialize_service },
        discontinued: student.services.discontinued.map {|service| ServiceSerializer.new(service).serialize_service }
      },
      deprecated: {
        interventions: student.interventions.map { |intervention| DeprecatedInterventionSerializer.new(intervention).serialize_intervention }
      }
    }
  end

  def filtered_events(mixed_events, options = {})
    time_now = options.fetch(:time_now, Time.now)
    months_back = options.fetch(:months_back, 48)
    cutoff_time = time_now - months_back.months
    mixed_events.where('occurred_at >= ? ', cutoff_time).order(occurred_at: :desc)
  end

  def discipline_incidents_as_json(student, options = {})
    time_now = options.fetch(:time_now, Time.now)
    limit = options.fetch(:limit, 100)
    incident_cards = Feed.new([student]).incident_cards(time_now, limit)
    incident_cards.map {|incident_card| incident_card.json }
  end
end
