class FileImporterOptions
  class ImporterDescription < Struct.new(:priority, :key, :importer_class, :source)
    def initialize
      if key != importer_class.name
        raise 'ImporterDescription key should match importer_class.name'
      end
    end
  end

  def self.importer_descriptions
    [
      ImporterDescription.new(110, 'EducatorsImporter', EducatorsImporter, :x2),
      ImporterDescription.new(200, 'CoursesSectionsImporter', CoursesSectionsImporter, :x2),
      ImporterDescription.new(210, 'EducatorSectionAssignmentsImporter', EducatorSectionAssignmentsImporter, :x2),
      ImporterDescription.new(220, 'StudentsImporter', StudentsImporter, :x2),
      ImporterDescription.new(230, 'StudentSectionAssignmentsImporter', StudentSectionAssignmentsImporter, :x2),
      ImporterDescription.new(310, 'BehaviorImporter', BehaviorImporter, :x2),
      ImporterDescription.new(320, 'AttendanceImporter', AttendanceImporter, :x2),
      ImporterDescription.new(330, 'StudentSectionGradesImporter', StudentSectionGradesImporter, :x2),
      ImporterDescription.new(340, 'X2AssessmentImporter', X2AssessmentImporter, :x2),
      ImporterDescription.new(400, 'StarMathImporter', StarMathImporter, :star),
      ImporterDescription.new(410, 'StarReadingImporter', StarReadingImporter, :star),
    ]
  end

  def self.ordered_by_priority(importers)
    importers.sort_by {|description| description.priority }
  end
end
