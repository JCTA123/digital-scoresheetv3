import React, { useEffect, useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import './App.css';

// ✅ Firebase Setup
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBtzd0B3fIDJ8XRM1ESKx3klnGZRtVy0Dg',
  authDomain: 'digital-scoresheet-by-jcta.firebaseapp.com',
  projectId: 'digital-scoresheet-by-jcta',
  storageBucket: 'digital-scoresheet-by-jcta.appspot.com',
  messagingSenderId: '911278880062',
  appId: '1:911278880062:web:7ae070f8bdc8e9bbe8686f',
  measurementId: 'G-C31DHJ8EXT',
  databaseURL: 'https://digital-scoresheet-by-jcta-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const DEFAULT_PASSWORD = 'JCTA123';

export default function App() {
  const [events, setEvents] = useState<any[]>([]);
  const [organizerView, setOrganizerView] = useState(false);
  const [currentJudge, setCurrentJudge] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [viewMode, setViewMode] = useState<'intro' | 'judge' | 'organizer'>('intro');
  const [orgPasswordInput, setOrgPasswordInput] = useState('');
  const [organizerPassword, setOrganizerPassword] = useState(DEFAULT_PASSWORD);
  const [pendingJudgeName, setPendingJudgeName] = useState('');
  const [judgeCodes, setJudgeCodes] = useState<string[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // 🔁 Firebase Sync: Read data
  useEffect(() => {
    onValue(ref(db, 'events'), snap => {
      const val = snap.val(); if (val) setEvents(val);
    });
    onValue(ref(db, 'chatMessages'), snap => {
      const val = snap.val(); if (val) setChatMessages(val);
    });
    onValue(ref(db, 'judgeCodes'), snap => {
      const val = snap.val(); if (val) setJudgeCodes(val);
    });
    onValue(ref(db, 'organizerPassword'), snap => {
      const val = snap.val(); if (val) setOrganizerPassword(val);
    });
  }, []);

  const updateFirebase = (key: string, data: any) => {
    set(ref(db, key), data);
  };

  const calcTotalForJudge = (ev: any, judge: string, participant: string) => {
    const pd = ev.scores?.[judge]?.[participant] || {};
    return ev.criteria.reduce((sum: number, c: string) => sum + (parseFloat(pd[c]) || 0), 0);
  };

  const calcTotalAllJudges = (ev: any, participant: string) =>
    ev.judges.reduce((sum: number, j: string) => sum + calcTotalForJudge(ev, j, participant), 0);

  const calcAvg = (ev: any, participant: string) =>
    ev.judges.length ? (calcTotalAllJudges(ev, participant) / ev.judges.length).toFixed(2) : '0';

  const renderSummary = (ev: any) => {
    const sorted = [...ev.participants]
      .map((p: string) => ({ name: p, avg: parseFloat(calcAvg(ev, p)) }))
      .sort((a, b) => b.avg - a.avg);
    return (
      <div className="summary-table">
        <h3>🏆 Rankings Summary</h3>
        <table><thead><tr><th>Rank</th><th>Participant</th><th>Average</th></tr></thead>
          <tbody>
            {sorted.map((e, i) => (
              <tr key={i}><td>{i + 1}</td><td>{e.name}</td><td>{e.avg}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  const createNewEvent = () => {
    const name = prompt('Enter event name:');
    if (!name) return;
    const newEvents = [
      ...events,
      {
        name,
        participants: ['Alice', 'Bob'],
        judges: ['Judge 1'],
        criteria: ['Creativity'],
        scores: {},
        visibleToJudges: false,
        submittedJudges: [],
      },
    ];
    updateFirebase('events', newEvents);
  };

  const deleteEvent = (idx: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      const copy = [...events];
      copy.splice(idx, 1);
      updateFirebase('events', copy);
    }
  };

  const updateEvent = (idx: number, newEv: any) => {
    const copy = [...events];
    copy[idx] = newEv;
    updateFirebase('events', copy);
  };

  const toggleVisibility = (idx: number) => {
    const ev = events[idx];
    updateEvent(idx, { ...ev, visibleToJudges: !ev.visibleToJudges });
  };

  const handleInputScore = (
    idx: number,
    judge: string,
    participant: string,
    crit: string,
    val: string
  ) => {
    const ev = events[idx];
    const scoreVal = Number(val);
    const newScores = {
      ...ev.scores,
      [judge]: {
        ...(ev.scores?.[judge] || {}),
        [participant]: {
          ...(ev.scores?.[judge]?.[participant] || {}),
          [crit]: scoreVal,
        },
      },
    };
    updateEvent(idx, { ...ev, scores: newScores });
  };

  const handleSubmitScores = (idx: number) => {
    const ev = events[idx];
    const updatedSubmitted = [...(ev.submittedJudges || []), currentJudge];
    updateEvent(idx, { ...ev, submittedJudges: updatedSubmitted });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const updatedMessages = [
        ...chatMessages,
        {
          sender: organizerView ? 'Organizer' : currentJudge,
          text: newMessage.trim(),
        },
      ];
      updateFirebase('chatMessages', updatedMessages);
      setNewMessage('');
    }
  };

  const generateJudgeCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const updatedCodes = [...judgeCodes, code];
    updateFirebase('judgeCodes', updatedCodes);
    alert('New Judge Code: ' + code);
  };

  const changeOrganizerPassword = () => {
    const newPass = prompt('Enter new password:');
    if (newPass && newPass.length >= 4) {
      updateFirebase('organizerPassword', newPass);
      alert('Password updated.');
    }
  };

  const handleJudgeLogin = () => {
    if (!judgeCodes.includes(codeInput.trim())) {
      alert('Invalid code');
      return;
    }
    if (!pendingJudgeName.trim()) {
      alert('Please enter a name.');
      return;
    }

    const updatedEvents = events.map((ev) => {
      if (!ev.judges.includes(pendingJudgeName)) {
        return { ...ev, judges: [...ev.judges, pendingJudgeName] };
      }
      return ev;
    });

    updateFirebase('events', updatedEvents);
    setCurrentJudge(pendingJudgeName);
    setViewMode('judge');
  };

  const handleOrganizerLogin = () => {
    if (orgPasswordInput === organizerPassword) {
      setOrganizerView(true);
      setViewMode('organizer');
    } else {
      alert('Incorrect password');
    }
  };
  const handleImport = () => {
    const input = prompt('Paste your exported JSON here:');
    if (input) {
      try {
        const parsed = JSON.parse(input);
        updateFirebase('events', parsed.events || []);
        updateFirebase('chatMessages', parsed.chatMessages || []);
        updateFirebase('judgeCodes', parsed.judgeCodes || []);
        updateFirebase(
          'organizerPassword',
          parsed.organizerPassword || DEFAULT_PASSWORD
        );
        alert('Data imported and synced to Firebase.');
      } catch {
        alert('Invalid data.');
      }
    }
  };

  const handleExport = () => {
    const exportData = {
      events,
      chatMessages,
      judgeCodes,
      organizerPassword,
    };
    navigator.clipboard.writeText(JSON.stringify(exportData));
    alert('Data copied to clipboard.');
  };

  const promptEditList = (title: string, oldList: string[], onSave: (list: string[]) => void) => {
    const result = prompt(`${title} (comma separated)`, oldList.join(', '));
    if (result !== null) {
      const newList = result.split(',').map((s) => s.trim()).filter(Boolean);
      onSave(newList);
    }
  };

  const exportOverallSummaryPDF = () => {
    const doc = new jsPDF();
    events.forEach((ev, i) => {
      doc.text(`${i + 1}. ${ev.name}`, 14, doc.autoTable.previous?.finalY || 10);
      const summary = ev.participants.map((p) => [
        p,
        calcTotalAllJudges(ev, p),
        calcAvg(ev, p),
      ]);
      autoTable(doc, {
        head: [['Participant', 'Total', 'Average']],
        body: summary.sort((a, b) => parseFloat(b[2]) - parseFloat(a[2])),
        startY: doc.autoTable.previous?.finalY + 5 || 20,
      });
    });
    doc.save('Overall_Summary.pdf');
  };

  const exportPerJudgePDF = () => {
    const doc = new jsPDF();
    events.forEach((ev, i) => {
      ev.judges.forEach((j) => {
        doc.addPage();
        doc.text(`${ev.name} - ${j}`, 14, 10);
        const data = ev.participants.map((p) => [
          p,
          ...ev.criteria.map((c) => ev.scores[j]?.[p]?.[c] ?? ''),
          calcTotalForJudge(ev, j, p),
        ]);
        autoTable(doc, {
          head: [['Participant', ...ev.criteria, 'Total']],
          body: data,
          startY: 20,
        });
      });
    });
    doc.save('Per_Judge_Results.pdf');
  };

  const exportSpecificEventPDF = () => {
    const evNames = events.map((e) => e.name);
    const selected = prompt(`Choose event:\n${evNames.join('\n')}`);
    const ev = events.find((e) => e.name === selected);
    if (!ev) return;

    const doc = new jsPDF();
    doc.text(ev.name, 14, 10);
    const data = ev.participants.map((p) => [
      p,
      ...ev.judges.map((j) => calcTotalForJudge(ev, j, p)),
      calcTotalAllJudges(ev, p),
      calcAvg(ev, p),
    ]);
    autoTable(doc, {
      head: [['Participant', ...ev.judges, 'Total', 'Average']],
      body: data,
      startY: 20,
    });
    doc.save(`${ev.name}_Summary.pdf`);
  };
  if (viewMode === 'intro') {
    return (
      <div className="intro-screen">
        <h1>🎯 Digital Scoresheet App</h1>
        <p className="text-center credits">made by JCTA</p>
        <div className="flex-center">
          <button className="btn-blue" onClick={() => setViewMode('judge')}>Login as Judge</button>
          <button className="btn-green" onClick={() => setViewMode('organizer')}>Login as Organizer</button>
        </div>
      </div>
    );
  }

  if (viewMode === 'organizer' && !organizerView) {
    return (
      <div className="intro-screen">
        <h2>🔒 Enter Organizer Password</h2>
        <input type="password" value={orgPasswordInput} onChange={(e) => setOrgPasswordInput(e.target.value)} />
        <br />
        <button className="btn-blue" onClick={handleOrganizerLogin}>Submit</button>
        <button className="btn-gray" onClick={() => setViewMode('intro')}>🔙 Back</button>
      </div>
    );
  }

  if (viewMode === 'judge' && !currentJudge) {
    return (
      <div className="intro-screen">
        <h2>Judge Login</h2>
        <input placeholder="Enter code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
        <input placeholder="Enter your name" value={pendingJudgeName} onChange={(e) => setPendingJudgeName(e.target.value)} />
        <br />
        <button className="btn-green" onClick={handleJudgeLogin}>Login</button>
        <button className="btn-gray" onClick={() => setViewMode('intro')}>🔙 Back</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="text-center">🎯 Digital Scoresheet App<br /><small className="credits">made by JCTA</small></h1>

      {/* Organizer Buttons */}
      {organizerView && (
        <>
          <div className="flex-center">
            <button onClick={() => setOrganizerView(!organizerView)} className="btn-blue">
              Switch to Judge View
            </button>
            <button onClick={createNewEvent} className="btn-green">➕ Add Event</button>
            <button onClick={handleImport} className="btn-yellow">📥 Import</button>
            <div className="dropdown-export">
              <button className="btn-purple">📤 Export ▼</button>
              <div className="dropdown-content">
                <button onClick={handleExport}>📋 Backup JSON</button>
                <button onClick={exportOverallSummaryPDF}>🏆 Export Overall Rankings PDF</button>
                <button onClick={exportPerJudgePDF}>🧑‍⚖️ Export Per-Judge Results PDF</button>
                <button onClick={exportSpecificEventPDF}>📄 Export Specific Event PDF</button>
              </div>
            </div>
          </div>

          <div className="organizer-controls">
            <button onClick={generateJudgeCode} className="btn-blue">🎫 Generate Judge Code</button>
            <button onClick={changeOrganizerPassword} className="btn-red">🔐 Change Password</button>
            <div className="codes-list">
              <h4>Active Judge Codes:</h4>
              <ul>{judgeCodes.map((code, idx) => <li key={idx}>{code}</li>)}</ul>
            </div>
          </div>
        </>
      )}

      {/* Chat Toggle */}
      <div className="chat-toggle" onClick={() => setChatOpen(!chatOpen)}>
        💬 Chat {chatOpen ? '▲' : '▼'}
      </div>
      {chatOpen && (
        <div className="chat-box" ref={chatRef}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.sender === 'Organizer' ? 'organizer' : 'judge'}`}>
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))}
          <div className="chat-input">
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type message..." />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}

      {/* Main View */}
      {organizerView
        ? events.map((ev, idx) => (
            <div key={idx} className="card">
              <div className="flex-center">
                <h2>{ev.name}</h2>
                <button className={ev.visibleToJudges ? 'btn-red' : 'btn-green'} onClick={() => toggleVisibility(idx)}>
                  {ev.visibleToJudges ? 'Hide from Judges' : 'Show to Judges'}
                </button>
                <button onClick={() => deleteEvent(idx)} className="btn-red">❌ Delete</button>
              </div>
              <div className="flex-center">
                <button className="btn-purple" onClick={() => promptEditList('Edit Participants', ev.participants, (list) => updateEvent(idx, { ...ev, participants: list }))}>
                  👥 Participants
                </button>
                <button className="btn-yellow" onClick={() => promptEditList('Edit Judges', ev.judges, (list) => updateEvent(idx, { ...ev, judges: list }))}>
                  🧑‍⚖️ Judges
                </button>
                <button className="btn-blue" onClick={() => promptEditList('Edit Criteria', ev.criteria, (list) => updateEvent(idx, { ...ev, criteria: list }))}>
                  📋 Criteria
                </button>
              </div>
              <table>
                <thead><tr><th>Participant</th>{ev.judges.map((j, jdx) => <th key={jdx}>{j}</th>)}<th>Total</th><th>Average</th></tr></thead>
                <tbody>
                  {ev.participants.map((p, pdx) => (
                    <tr key={pdx}>
                      <td>{p}</td>
                      {ev.judges.map((j, jdx) => <td key={jdx}>{calcTotalForJudge(ev, j, p)}</td>)}
                      <td>{calcTotalAllJudges(ev, p)}</td>
                      <td>{calcAvg(ev, p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderSummary(ev)}
            </div>
          ))
        : events.map((ev, idx) =>
            ev.visibleToJudges && ev.judges.includes(currentJudge) && (
              <div key={idx} className="card">
                <h2>{ev.name}</h2>
                <table>
                  <thead><tr><th>Participant</th>{ev.criteria.map((c, cdx) => <th key={cdx}>{c}</th>)}<th>Total</th></tr></thead>
                  <tbody>
                    {ev.participants.map((p, pdx) => (
                      <tr key={pdx}>
                        <td>{p}</td>
                        {ev.criteria.map((c, cdx) => (
                          <td key={cdx}>
                            <input
                              type="number"
                              value={ev.scores[currentJudge]?.[p]?.[c] ?? ''}
                              disabled={ev.submittedJudges?.includes(currentJudge)}
                              onChange={(e) => handleInputScore(idx, currentJudge, p, c, e.target.value)}
                            />
                          </td>
                        ))}
                        <td>{calcTotalForJudge(ev, currentJudge, p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!ev.submittedJudges?.includes(currentJudge) ? (
                  <button className="btn-green" onClick={() => handleSubmitScores(idx)}>Submit Scores</button>
                ) : (
                  <>
                    <p className="submitted-label">Submitted. You can view but not change scores.</p>
                    {renderSummary(ev)}
                  </>
                )}
              </div>
            )
          )}

      {/* Watermark */}
      <div style={{ display: 'none' }}>
        {Array.from('JOHN CARL TABANAO ALCORIN ').map((char) => char.charCodeAt(0).toString(2)).join(' ')}
      </div>
    </div>
  );
}
