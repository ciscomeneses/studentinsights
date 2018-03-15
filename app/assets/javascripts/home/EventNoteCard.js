import React from 'react';
import Card from '../components/Card';
import Educator from '../components/Educator';
import Homeroom from '../components/Homeroom';
import HouseBadge from '../components/HouseBadge';
import NoteBadge from '../components/NoteBadge';
import {toMomentFromTime} from '../helpers/toMoment';
import {gradeText} from '../helpers/gradeText';
import {eventNoteTypeText} from '../components/eventNoteType';


// Render a card in the feed for an EventNote
class EventNoteCard extends React.Component {
  render() {
    const {nowFn} = this.context;
    const now = nowFn();
    const {eventNoteCardJson, style} = this.props;
    const {student, educator} = eventNoteCardJson;
    const {homeroom} = student;

    return (
      <Card className="EventNoteCard" style={style}>
        <div style={styles.header}>
          <div style={styles.studentHeader}>
            <div>
              <div>
                <a style={styles.person} href={`/students/${student.id}`}>{student.first_name} {student.last_name}</a>
              </div>
              <div>{gradeText(student.grade)}</div>
              <div>
                {homeroom && <Homeroom
                  id={homeroom.id}
                  name={homeroom.name}
                  educator={homeroom.educator} />}
              </div>
            </div>
          </div>
          <div style={styles.by}>
            <div>
              <span>by </span>
              <Educator
                style={styles.person}
                educator={educator} />
            </div>
            <div>in {eventNoteTypeText(eventNoteCardJson.event_note_type_id)}</div>
            <div>{toMomentFromTime(eventNoteCardJson.recorded_at).from(now)} on {toMomentFromTime(eventNoteCardJson.recorded_at).format('M/D')}</div>
          </div>
        </div>
        <div style={styles.body}>
          <div>{eventNoteCardJson.text}</div>
        </div>
        <div style={styles.footer}>
          {student.house && <HouseBadge style={styles.footerBadge} house={student.house} />}
          <NoteBadge style={styles.footerBadge} eventNoteTypeId={eventNoteCardJson.event_note_type_id} />
        </div>
      </Card>
    );
  }
}
EventNoteCard.contextTypes = {
  nowFn: React.PropTypes.func.isRequired
};
EventNoteCard.propTypes = {
  eventNoteCardJson: React.PropTypes.shape({
    recorded_at: React.PropTypes.string.isRequired,
    event_note_type_id: React.PropTypes.number.isRequired,
    text: React.PropTypes.string.isRequired,
    educator: React.PropTypes.object.isRequired,
    student: React.PropTypes.shape({
      id: React.PropTypes.number.isRequired,
      first_name: React.PropTypes.string.isRequired,
      last_name: React.PropTypes.string.isRequired,
      grade: React.PropTypes.string.isRequired,
      house: React.PropTypes.string,
      homeroom: React.PropTypes.shape({
        id: React.PropTypes.number.isRequired,
        name: React.PropTypes.string.isRequired,
        educator: React.PropTypes.object
      })
    })
  }).isRequired,
  style: React.PropTypes.object
};


const styles = {
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  studentHeader: {
    display: 'flex',
    alignItems: 'center'
  },
  body: {
    marginBottom: 20,
    marginTop: 20
  },
  by: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 5
  },
  footerBadge: {
    marginLeft: 5
  },
  person: {
    fontWeight: 'bold'
  }
};

export default EventNoteCard;