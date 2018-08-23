require 'rails_helper'

describe EventNotesController, :type => :controller do
  let!(:pals) { TestPals.create! }
  let(:school) { FactoryBot.create(:school) }

  describe '#create' do
    def make_create_request(student, event_note_params = {})
      request.env['HTTPS'] = 'on'
      post :create, params: {
        format: :json,
        student_id: student.id,
        event_note: event_note_params
      }
    end

    def post_params(event_note_params = {})
      {
        student_id: student.id,
        event_note_type_id: EventNoteType.all.sample.id,
        text: 'foo',
        is_restricted: false,
        event_note_attachments_attributes: []
      }.merge(event_note_params)
    end

    context 'happy path' do
      let!(:educator) { pals.shs_jodi }
      let!(:student) { pals.shs_freshman_mari }
      before { sign_in(educator) }

      it 'creates a new event note' do
        expect { make_create_request(student, post_params) }.to change(EventNote, :count).by 1
      end

      it 'responds with json' do
        make_create_request(student, post_params)
        expect(response.status).to eq 200
        expect(response.headers["Content-Type"]).to eq 'application/json; charset=utf-8'
        expect(JSON.parse(response.body).keys).to eq [
          'id',
          'student_id',
          'educator_id',
          'event_note_type_id',
          'text',
          'recorded_at',
          'is_restricted',
          'event_note_revisions_count',
          'attachments'
        ]
      end
    end

    context 'edge cases for parameters' do
      let!(:educator) { pals.shs_jodi }
      let!(:student) { pals.shs_freshman_mari }
      before { sign_in(educator) }

      it 'ignores educator_id in params' do
        make_create_request(student, post_params(educator_id: 350))
        expect(response.status).to eq 200
        response_body = JSON.parse(response.body)
        expect(response_body['educator_id']).to eq educator.id
        expect(response_body['educator_id']).not_to eq 350
      end

      it 'fails when missing student_id' do
        make_create_request(student, post_params.except(:student_id))
        expect(response.status).to eq 404
      end

      it 'fails when missing event_note_type_id' do
        make_create_request(student, post_params.except(:event_note_type_id))
        expect(response.status).to eq 422
        response_body = JSON.parse(response.body)
        expect(response_body).to eq("errors" => ["Event note type can't be blank"])
      end

      it 'setting recorded_at does not work' do
        make_create_request(student, post_params(recorded_at: 'bogus!'))
        expect(response.status).to eq 200
        json = JSON.parse(response.body)
        expect(json['recorded_at']).not_to eq 'bogus!'
      end
    end

    context 'authorization checks, with Mari as test case' do
      let!(:student) { pals.shs_freshman_mari }

      it 'guards from creating a note for an unauthorized student' do
        sign_in(pals.healey_laura_principal)
        expect { make_create_request(student, post_params) }.to change(EventNote, :count).by 0
        expect(response.status).to eq 403
      end

      it 'guards setting is_restricted:true without access' do
        sign_in(pals.shs_jodi)
        expect { make_create_request(student, post_params) }.to change(EventNote, :count).by 1
        expect(response.status).to eq 200
        json = JSON.parse(response.body)
        expect(json['is_restricted']).to eq false
      end

      it 'permits is_restricted:true with access, and response includes restricted note text' do
        sign_in(pals.rich_districtwide)
        expect {
          make_create_request(student, post_params({
            is_restricted: true,
            text: 'RESTRICTED-sensitive-message'
          }))
        }.to change(EventNote, :count).by 1
        expect(response.status).to eq 200
        json = JSON.parse(response.body)
        expect(json['is_restricted']).to eq true
        expect(json['text']).to eq 'RESTRICTED-sensitive-message'
      end

      it 'guards access when not logged in' do
        expect { make_create_request(student, post_params) }.to change(EventNote, :count).by 0
        expect(response.status).to eq 401
      end
    end
  end

  # describe '#update' do
  #   def make_put_request(student, event_note_params = {})
  #     request.env['HTTPS'] = 'on'
  #     put :update, params: {
  #       format: :json,
  #       student_id: student.id,
  #       id: event_note_params[:id],
  #       event_note: event_note_params
  #     }
  #   end

  #   context 'admin educator logged in' do
  #     let(:educator) { FactoryBot.create(:educator, :admin, school: school) }
  #     let!(:student) { FactoryBot.create(:student, school: school) }

  #     before do
  #       sign_in(educator)
  #     end

  #     it 'does not allow anyone to change is_restricted' do
  #       event_note = FactoryBot.create(:event_note, {
  #         text: 'RESTRICTED-alpha',
  #         is_restricted: true
  #       })
  #       make_put_request(student, {
  #         id: event_note.id,
  #         text: 'RESTRICTED-beta',
  #         is_restricted: false
  #       })

  #       event_note.reload
  #       expect(event_note.is_restricted).to eq true
  #       expect(event_note.text).to eq 'RESTRICTED-beta'
  #       json = JSON.parse(response.body)
  #       expect(json['is_restricted']).to eq true
  #       expect(json['text']).to eq 'RESTRICTED-beta'
  #     end

  #     context 'valid first edit request' do
  #       let!(:event_note) { FactoryBot.create(:event_note) }
  #       let(:post_params) {
  #         {
  #           id: event_note.id,
  #           text: 'bar'
  #         }
  #       }
  #       it 'does not add a new event note' do
  #         expect { make_put_request(student, post_params) }.to change(EventNote, :count).by 0
  #       end
  #       it 'updates an existing event note' do
  #         Timecop.freeze(post_params[:recorded_at]) do
  #           make_put_request(student, post_params)
  #         end
  #         updated_event_note = EventNote.find(event_note.id)
  #         expect(updated_event_note.recorded_at.to_i).to eq event_note.recorded_at.to_i
  #         expect(updated_event_note.text).to eq(post_params['text'])
  #         expect(event_note.reload.text).to eq(post_params['text'])
  #       end
  #       it 'creates a new event note revision' do
  #         expect { make_put_request(student, post_params) }.to change(EventNoteRevision, :count).by 1
  #       end
  #       it 'saves the previous note revision' do
  #         make_put_request(student, post_params)
  #         event_note_revision = EventNoteRevision.last
  #         expect(event_note_revision.event_note_id).to eq event_note.id
  #         expect(event_note_revision.version).to eq 1
  #         expect(event_note_revision.attributes.except(
  #           'id',
  #           'event_note_id',
  #           'version',
  #           'created_at',
  #           'updated_at',
  #           'is_restricted'
  #         )).to eq event_note.attributes.except(
  #           'id',
  #           'created_at',
  #           'updated_at',
  #           'recorded_at',
  #           'is_restricted'
  #         )
  #       end
  #     end

  #     context 'valid second edit request' do
  #       let!(:event_note_revision) { FactoryBot.create(:event_note_revision) }
  #       let!(:event_note) { event_note_revision.event_note }
  #       let!(:post_params) {
  #         {
  #           id: event_note.id,
  #           student_id: student.id,
  #           event_note_type_id: event_note_type.id,
  #           recorded_at: Time.now,
  #           text: 'baz'
  #         }
  #       }
  #       it 'creates a second event note revision' do
  #         make_put_request(student, post_params)
  #         expect(EventNoteRevision.last.version).to eq 2
  #       end
  #     end
  #   end

  #   context 'educator who can view restricted notes logged in' do
  #     let(:educator) { FactoryBot.create(:educator, :admin, school: school, can_view_restricted_notes: true) }
  #     let!(:student) { FactoryBot.create(:student, school: school) }

  #     before do
  #       sign_in(educator)
  #     end

  #     context 'valid first edit request' do
  #       let!(:event_note) { FactoryBot.create(:event_note) }
  #       let(:post_params) {
  #         {
  #           id: event_note.id,
  #           student_id: student.id,
  #           event_note_type_id: event_note_type.id,
  #           recorded_at: Time.now,
  #           text: 'bar',
  #           is_restricted: true
  #         }
  #       }
  #       it 'updates an existing event note' do
  #         Timecop.freeze(post_params[:recorded_at]) do
  #           make_put_request(student, post_params)
  #         end
  #         updated_event_note = EventNote.find(event_note.id)
  #         expect(updated_event_note.recorded_at.to_i).to eq event_note.recorded_at.to_i
  #         expect(updated_event_note.attributes.except(
  #           'educator_id',
  #           'created_at',
  #           'updated_at',
  #           'recorded_at'
  #         )).to eq post_params.stringify_keys.except(
  #           'created_at',
  #           'updated_at',
  #           'recorded_at'
  #         )
  #       end
  #     end
  #   end
end
