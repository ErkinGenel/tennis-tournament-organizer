import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Calendar, Trophy, GitCommit, Printer, PlusCircle,
  Play, CheckCircle, ChevronRight, X
} from 'lucide-react';

// --- Constants & Config ---
const COURTS = 6;
const TIME_SLOTS = ['09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30'];
const CATEGORIES = { U50: 'Herren unter 50', O50: 'Herren über 50' };
const LEVELS = [3, 2, 1]; // 3 is highest

const MOCK_CLUBS = ['TC Wannweil', 'TC Reutlingen', 'TC Tübingen', 'TC Metzingen', 'TC Pfullingen', 'TV Kirchentellinsfurt'];
const MOCK_FIRST_NAMES = ['Lukas', 'Maximilian', 'Jonas', 'Paul', 'Leon', 'Finn', 'Elias', 'Ben', 'Luis', 'Felix', 'Markus', 'Thomas', 'Michael', 'Andreas', 'Stefan', 'Christian', 'Martin', 'Daniel'];
const MOCK_LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer'];

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generateTeamName = () => `${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)} / ${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)}`;

// --- Main Application Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState('registration');
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState({ U50: {}, O50: {} });
  const [matches, setMatches] = useState([]);
  const [brackets, setBrackets] = useState({ U50: null, O50: null });
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ name: '', club: '', level: '2', category: 'U50' });

  // Score Modal State
  const [scoreModal, setScoreModal] = useState(null);

  // --- 1. Registration Logic ---
  const handleRegister = (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.club) return;
    setTeams([...teams, { id: generateId(), ...regForm, level: parseInt(regForm.level) }]);
    setRegForm({ name: '', club: '', level: '2', category: 'U50' });
  };

  const loadMockData = () => {
    const mockTeams = [];
    ['U50', 'O50'].forEach(category => {
      for (let i = 0; i < 12; i++) { // 12 teams per category
        mockTeams.push({
          id: generateId(),
          name: generateTeamName(),
          club: getRandom(MOCK_CLUBS),
          level: getRandom(LEVELS),
          category
        });
      }
    });
    setTeams(mockTeams);
    setGroups({ U50: {}, O50: {} });
    setMatches([]);
    setBrackets({ U50: null, O50: null });
    setActiveTab('groups');
  };

  // --- 2. Group Generation Logic (Snake Draft + Club Constraint) ---
  const generateGroups = () => {
    const newGroups = { U50: {}, O50: {} };
    
    ['U50', 'O50'].forEach(cat => {
      const catTeams = teams.filter(t => t.category === cat).sort((a, b) => b.level - a.level); // Sort high to low
      const numGroups = Math.ceil(catTeams.length / 4) || 1; // Aim for 4 per group
      
      const groupArrays = Array.from({ length: numGroups }, () => []);
      
      let dir = 1; // 1 for forward, -1 for backward (Snake draft)
      let gIndex = 0;

      const unassigned = [...catTeams];

      while (unassigned.length > 0) {
        // Find best fit team avoiding club collision if possible
        let selectedIdx = 0;
        const currentGroupClubs = groupArrays[gIndex].map(t => t.club);
        
        const safeIdx = unassigned.findIndex(t => !currentGroupClubs.includes(t.club));
        if (safeIdx !== -1) selectedIdx = safeIdx;

        const team = unassigned.splice(selectedIdx, 1)[0];
        groupArrays[gIndex].push(team);

        // Snake logic
        gIndex += dir;
        if (gIndex >= numGroups || gIndex < 0) {
          dir *= -1;
          gIndex += dir; // stay on bounds
        }
      }

      // Format to object
      groupArrays.forEach((arr, i) => {
        newGroups[cat][`Group ${String.fromCharCode(65 + i)}`] = arr;
      });
    });

    setGroups(newGroups);
    setMatches([]); // Reset schedule if groups change
    setActiveTab('groups');
  };

  // --- 3. Match Scheduling Logic ---
  const generateSchedule = () => {
    let newMatches = [];
    let day = 1;
    let slotIndex = 0;
    let courtIndex = 1;

    const addMatch = (team1, team2, category, groupName) => {
      if (courtIndex > COURTS) {
        courtIndex = 1;
        slotIndex++;
        if (slotIndex >= TIME_SLOTS.length) {
          slotIndex = 0;
          day++;
        }
      }
      
      newMatches.push({
        id: generateId(),
        day,
        time: TIME_SLOTS[slotIndex],
        court: courtIndex,
        category,
        stage: 'Group',
        groupName,
        team1,
        team2,
        score: null,
        winnerId: null
      });
      courtIndex++;
    };

    ['U50', 'O50'].forEach(cat => {
      Object.entries(groups[cat]).forEach(([groupName, groupTeams]) => {
        // Round Robin
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            addMatch(groupTeams[i], groupTeams[j], cat, groupName);
          }
        }
      });
    });

    setMatches(newMatches);
    setActiveTab('schedule');
  };

  // --- 4. Scoring & Standings Logic ---
  const handleSaveScore = (matchId, s1, s2, tb) => {
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;
      
      // Determine Winner
      let t1Sets = 0; let t2Sets = 0;
      if (s1[0] > s1[1]) t1Sets++; else if (s1[1] > s1[0]) t2Sets++;
      if (s2[0] > s2[1]) t1Sets++; else if (s2[1] > s2[0]) t2Sets++;
      
      if (t1Sets === 1 && t2Sets === 1 && tb) {
        if (tb[0] > tb[1]) t1Sets++; else if (tb[1] > tb[0]) t2Sets++;
      }

      const winnerId = t1Sets > t2Sets ? m.team1.id : (t2Sets > t1Sets ? m.team2.id : null);

      return { ...m, score: { s1, s2, tb }, winnerId };
    }));
    setScoreModal(null);
  };

  const standings = useMemo(() => {
    const stats = {};
    teams.forEach(t => {
      stats[t.id] = { ...t, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 };
    });

    matches.filter(m => m.stage === 'Group' && m.score).forEach(m => {
      const { s1, s2, tb } = m.score;
      const t1 = stats[m.team1.id];
      const t2 = stats[m.team2.id];
      
      if(!t1 || !t2) return;

      t1.played++; t2.played++;
      if (m.winnerId === t1.id) { t1.won++; t2.lost++; }
      else if (m.winnerId === t2.id) { t2.won++; t1.lost++; }

      const addStats = (teamStats, oppStats, scoreArr) => {
        if (!scoreArr || scoreArr.length !== 2) return;
        teamStats.gamesWon += scoreArr[0] || 0; teamStats.gamesLost += scoreArr[1] || 0;
        oppStats.gamesWon += scoreArr[1] || 0; oppStats.gamesLost += scoreArr[0] || 0;
        if ((scoreArr[0] || 0) > (scoreArr[1] || 0)) { teamStats.setsWon++; oppStats.setsLost++; }
        else if ((scoreArr[1] || 0) > (scoreArr[0] || 0)) { oppStats.setsWon++; teamStats.setsLost++; }
      };

      addStats(t1, t2, s1);
      addStats(t1, t2, s2);
      if (tb && (tb[0] > 0 || tb[1] > 0)) addStats(t1, t2, tb);
    });

    const calculatedStandings = { U50: {}, O50: {} };
    ['U50', 'O50'].forEach(cat => {
      Object.entries(groups[cat]).forEach(([gName, gTeams]) => {
        calculatedStandings[cat][gName] = gTeams.map(t => stats[t.id]).sort((a, b) => {
          if (b.won !== a.won) return b.won - a.won; // Wins first
          const aSetDiff = a.setsWon - a.setsLost; const bSetDiff = b.setsWon - b.setsLost;
          if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff; // Set diff second
          const aGameDiff = a.gamesWon - a.gamesLost; const bGameDiff = b.gamesWon - b.gamesLost;
          return bGameDiff - aGameDiff; // Game diff third
        });
      });
    });
    return calculatedStandings;
  }, [teams, groups, matches]);


  // --- 5. K.O. Bracket Generation Logic ---
  const generateKO = () => {
    const newBrackets = { U50: null, O50: null };
    let newMatches = [...matches.filter(m => m.stage === 'Group')]; // Keep group matches, reset KO
    let timeSlotIndex = 0;
    let courtIndex = 1;

    const getNextTime = () => {
      const time = TIME_SLOTS[timeSlotIndex];
      const court = courtIndex;
      courtIndex++;
      if (courtIndex > COURTS) { courtIndex = 1; timeSlotIndex++; }
      return { day: 2, time, court };
    };

    ['U50', 'O50'].forEach(cat => {
      // 1. Gather Qualifiers (Top 2 from each group)
      let qualifiers = [];
      Object.values(standings[cat]).forEach(groupStandings => {
        if (groupStandings[0]) qualifiers.push({ ...groupStandings[0], seedType: '1st' });
        if (groupStandings[1]) qualifiers.push({ ...groupStandings[1], seedType: '2nd' });
      });

      if (qualifiers.length === 0) return;

      // Sort qualifiers to determine seeds
      qualifiers.sort((a, b) => {
        if (a.seedType !== b.seedType) return a.seedType === '1st' ? -1 : 1;
        if (b.won !== a.won) return b.won - a.won;
        return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
      });

      // 2. Build 8-team Bracket (Assuming 3 groups -> 6 teams advance)
      // Pad to 8 with Byes
      while (qualifiers.length < 8) qualifiers.push({ isBye: true, name: 'BYE' });

      // Standard fixed 8-team seeding:
      // QF1: Seed 1 vs Seed 8(Bye)
      // QF2: Seed 4 vs Seed 5
      // QF3: Seed 3 vs Seed 6
      // QF4: Seed 2 vs Seed 7(Bye)
      
      const qfNodes = [
        { id: `qf1_${cat}`, team1: qualifiers[0], team2: qualifiers[7], next: `sf1_${cat}` },
        { id: `qf2_${cat}`, team1: qualifiers[3], team2: qualifiers[4], next: `sf1_${cat}` },
        { id: `qf3_${cat}`, team1: qualifiers[2], team2: qualifiers[5], next: `sf2_${cat}` },
        { id: `qf4_${cat}`, team1: qualifiers[1], team2: qualifiers[6], next: `sf2_${cat}` }
      ];

      // Schedule QF Matches
      qfNodes.forEach(node => {
        if (!node.team1.isBye && !node.team2.isBye) {
           const schedule = getNextTime();
           newMatches.push({
             id: node.id, category: cat, stage: 'KO', groupName: 'Quarter-Final',
             team1: node.team1, team2: node.team2, score: null, winnerId: null, nextMatchId: node.next,
             ...schedule
           });
        }
      });

      timeSlotIndex++; // Gap before Semis
      courtIndex = 1;

      // Define SF & Final structure for bracket rendering
      const sfNodes = [
        { id: `sf1_${cat}`, title: 'Semi-Final 1', next: `final_${cat}` },
        { id: `sf2_${cat}`, title: 'Semi-Final 2', next: `final_${cat}` }
      ];
      const finalNode = { id: `final_${cat}`, title: 'Grand Final' };
      const placementNodes = [
        { id: `place_5_${cat}`, title: 'Placement (Losers QF)' },
        { id: `place_3_${cat}`, title: '3rd Place Match (Losers SF)' }
      ];

      newBrackets[cat] = { qf: qfNodes, sf: sfNodes, final: finalNode, placements: placementNodes };
    });

    setBrackets(newBrackets);
    setMatches(newMatches);
    setActiveTab('bracket');
  };

  // Auto-progress winners in KO bracket
  useEffect(() => {
    if (!brackets.U50 && !brackets.O50) return;

    let updatedMatches = [...matches];
    let changesMade = false;

    // Helper to push team to next round
    const pushToNextRound = (matchId, winnerTeam, loserTeam) => {
       const match = matches.find(m => m.id === matchId);
       if (!match || !match.nextMatchId) return;

       let nextMatch = updatedMatches.find(m => m.id === match.nextMatchId);
       if (!nextMatch) {
         // Create next match if it doesn't exist
         const isFinal = match.nextMatchId.startsWith('final');
         nextMatch = {
           id: match.nextMatchId, category: match.category, stage: 'KO', 
           groupName: isFinal ? 'Final' : 'Semi-Final',
           team1: winnerTeam, team2: null, score: null, winnerId: null,
           day: 2, time: TIME_SLOTS[4], court: Math.floor(Math.random() * 3) + 1,
           nextMatchId: isFinal ? null : `final_${match.category}`
         };
         updatedMatches.push(nextMatch);
         changesMade = true;
       } else if (!nextMatch.team2 && nextMatch.team1.id !== winnerTeam.id) {
         nextMatch.team2 = winnerTeam;
         changesMade = true;
       }

       // Handle Placements (Losers bracket)
       let placementId = null;
       let pGroupName = '';
       if (matchId.startsWith('qf')) { placementId = `place_5_${match.category}`; pGroupName = 'Placement Match'; }
       if (matchId.startsWith('sf')) { placementId = `place_3_${match.category}`; pGroupName = '3rd Place Match'; }
       
       if (placementId && loserTeam) {
         let pMatch = updatedMatches.find(m => m.id === placementId);
         if (!pMatch) {
            pMatch = {
             id: placementId, category: match.category, stage: 'Placement', groupName: pGroupName,
             team1: loserTeam, team2: null, score: null, winnerId: null,
             day: 2, time: TIME_SLOTS[5], court: Math.floor(Math.random() * 3) + 4
           };
           updatedMatches.push(pMatch);
           changesMade = true;
         } else if (!pMatch.team2 && pMatch.team1.id !== loserTeam.id) {
           pMatch.team2 = loserTeam;
           changesMade = true;
         }
       }
    };

    matches.filter(m => m.stage === 'KO' && m.winnerId).forEach(m => {
       const winner = m.winnerId === m.team1.id ? m.team1 : m.team2;
       const loser = m.winnerId === m.team1.id ? m.team2 : m.team1;
       pushToNextRound(m.id, winner, loser);
    });

    // Handle Byes auto-advancing
    ['U50', 'O50'].forEach(cat => {
      if(brackets[cat]) {
        brackets[cat].qf.forEach(qf => {
          if (qf.team1.isBye) pushToNextRound(qf.id, qf.team2, null);
          if (qf.team2.isBye) pushToNextRound(qf.id, qf.team1, null);
        });
      }
    });

    if (changesMade) setMatches(updatedMatches);

  }, [matches, brackets]);


  const renderScore = (score) => {
    if (!score) return <span className="text-gray-400">vs</span>;
    let text = `${score.s1[0]}:${score.s1[1]} | ${score.s2[0]}:${score.s2[1]}`;
    if (score.tb && (score.tb[0] > 0 || score.tb[1] > 0)) text += ` | [${score.tb[0]}:${score.tb[1]}]`;
    return <span className="font-semibold text-blue-700">{text}</span>;
  };

  // --- Rendering UI ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Top Header */}
      <header className="bg-blue-900 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold">Tennis Tournament Organizer</h1>
          </div>
          <button 
            onClick={() => window.print()} 
            className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg transition"
          >
            <Printer size={18} /> <span>Print A3 PDF</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-8 print:hidden">
          {[
            { id: 'registration', icon: Users, label: 'Registration' },
            { id: 'groups', icon: GitCommit, label: 'Groups & Standings' },
            { id: 'schedule', icon: Calendar, label: 'Schedule & Scores' },
            { id: 'bracket', icon: Trophy, label: 'K.O. Bracket' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === t.id ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'
              }`}
            >
              <t.icon size={18} /> <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* --- TAB CONTENT --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:border-none print:shadow-none print:p-0">
          
          {/* TAB 1: REGISTRATION */}
          {activeTab === 'registration' && (
            <div className="space-y-8 print:hidden">
              <div className="flex justify-between items-center bg-blue-50 p-6 rounded-xl border border-blue-100">
                <div>
                  <h2 className="text-xl font-bold text-blue-900">Tournament Setup</h2>
                  <p className="text-blue-700 text-sm mt-1">Register teams manually or generate a mock tournament for testing.</p>
                </div>
                <button onClick={loadMockData} className="flex items-center space-x-2 bg-white text-blue-700 border border-blue-200 px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-50 font-medium">
                  <Play size={18} /> <span>Load Mock Tournament (24 Teams)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form */}
                <div className="col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-lg mb-4 flex items-center"><PlusCircle size={18} className="mr-2"/> New Team</h3>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1">Team Name (Player 1 / Player 2)</label>
                      <input value={regForm.name} onChange={e=>setRegForm({...regForm, name: e.target.value})} className="w-full p-2 border rounded-md" placeholder="e.g. Müller / Schmidt" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Club</label>
                      <input value={regForm.club} onChange={e=>setRegForm({...regForm, club: e.target.value})} className="w-full p-2 border rounded-md" placeholder="e.g. TC Wannweil" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Level (1-3)</label>
                        <select value={regForm.level} onChange={e=>setRegForm({...regForm, level: e.target.value})} className="w-full p-2 border rounded-md">
                          <option value="3">3 - Advanced</option><option value="2">2 - Intermediate</option><option value="1">1 - Beginner</option>
                        </select></div>
                      <div><label className="block text-sm font-medium mb-1">Category</label>
                        <select value={regForm.category} onChange={e=>setRegForm({...regForm, category: e.target.value})} className="w-full p-2 border rounded-md">
                          <option value="U50">U50 (Unter 50)</option><option value="O50">O50 (Über 50)</option>
                        </select></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium mt-2">Register Team</button>
                  </form>
                </div>
                
                {/* List */}
                <div className="col-span-2">
                  <h3 className="font-bold text-lg mb-4">Registered Teams ({teams.length})</h3>
                  <div className="overflow-auto max-h-[500px] border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr><th className="p-3 border-b">Team</th><th className="p-3 border-b">Club</th><th className="p-3 border-b">Category</th><th className="p-3 border-b">Level</th></tr>
                      </thead>
                      <tbody>
                        {teams.length === 0 ? <tr><td colSpan="4" className="p-6 text-center text-gray-500">No teams registered yet.</td></tr> : 
                         teams.map((t, i) => (
                          <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="p-3 font-medium">{t.name}</td><td className="p-3">{t.club}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${t.category==='U50'?'bg-green-100 text-green-700':'bg-purple-100 text-purple-700'}`}>{CATEGORIES[t.category]}</span></td>
                            <td className="p-3"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Lvl {t.level}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GROUPS & STANDINGS */}
          {activeTab === 'groups' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center print:hidden">
                <p className="text-gray-600">Groups are balanced by skill level and club affiliation.</p>
                <div className="space-x-3">
                   <button onClick={generateGroups} disabled={teams.length < 4} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium disabled:opacity-50">
                     1. Re-Generate Groups
                   </button>
                   <button onClick={generateSchedule} disabled={Object.keys(groups.U50).length === 0} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50">
                     2. Generate Schedule
                   </button>
                </div>
              </div>

              {['U50', 'O50'].map(cat => (
                 Object.keys(groups[cat]).length > 0 && (
                   <div key={cat} className="mb-10 page-break-after">
                     <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 flex items-center">
                       {CATEGORIES[cat]} <span className="ml-3 text-sm bg-gray-200 px-2 py-1 rounded-full">{Object.keys(groups[cat]).length} Groups</span>
                     </h2>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(groups[cat]).map(([groupName, groupTeams]) => (
                          <div key={groupName} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-100 p-3 font-bold border-b border-gray-200 flex justify-between">
                              <span>{groupName}</span>
                            </div>
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                  <th className="px-4 py-2">Pos</th><th className="px-4 py-2">Team</th><th className="px-4 py-2 text-center">W-L</th><th className="px-4 py-2 text-center">Sets</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(standings[cat][groupName] || groupTeams).map((t, index) => (
                                  <tr key={t.id} className="border-b last:border-0">
                                    <td className="px-4 py-3 font-bold text-gray-400">{index + 1}</td>
                                    <td className="px-4 py-3">
                                      <div className="font-medium text-gray-900">{t.name}</div>
                                      <div className="text-xs text-gray-500">{t.club}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                                    <td className="px-4 py-3 text-center text-gray-500">{t.setsWon !== undefined ? `${t.setsWon}:${t.setsLost}` : '0:0'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                     </div>
                   </div>
                 )
              ))}
            </div>
          )}

          {/* TAB 3: SCHEDULE & SCORES */}
          {activeTab === 'schedule' && (
            <div>
               <div className="flex justify-between items-center mb-6 print:hidden">
                 <h2 className="text-xl font-bold">Match Schedule</h2>
                 <button onClick={generateKO} disabled={matches.length === 0} className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium shadow-sm hover:bg-green-700 transition flex items-center">
                    <Trophy size={18} className="mr-2"/> Generate K.O. Bracket (Day 2)
                 </button>
               </div>

               <div className="space-y-8">
                 {[1, 2].map(day => {
                    const dayMatches = matches.filter(m => m.day === day).sort((a,b) => TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time));
                    if (dayMatches.length === 0) return null;
                    
                    return (
                      <div key={day} className="mb-8">
                        <h3 className="text-lg font-bold bg-blue-900 text-white p-3 rounded-t-xl">Day {day} {day===1 ? '(Group Stage)' : '(Finals & Placements)'}</h3>
                        <div className="border border-blue-900 rounded-b-xl overflow-hidden bg-white">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600">
                              <tr><th className="p-3 text-left">Time</th><th className="p-3 text-left">Court</th><th className="p-3 text-left">Stage</th><th className="p-3 text-right w-1/3">Team 1</th><th className="p-3 text-center w-32">Score</th><th className="p-3 text-left w-1/3">Team 2</th></tr>
                            </thead>
                            <tbody>
                              {dayMatches.map((m) => {
                                const isT1Winner = m.winnerId === m.team1?.id;
                                const isT2Winner = m.winnerId === m.team2?.id;
                                
                                return (
                                <tr key={m.id} className="border-b last:border-0 hover:bg-blue-50 transition cursor-pointer" onClick={() => !m.team1?.isBye && !m.team2?.isBye && setScoreModal(m)}>
                                  <td className="p-3 font-bold text-gray-700">{m.time}</td>
                                  <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded-full text-xs font-bold">Crt {m.court}</span></td>
                                  <td className="p-3 text-xs">
                                    <span className="block font-bold text-blue-700">{CATEGORIES[m.category].substring(0,3)} {m.category}</span>
                                    <span className="text-gray-500">{m.groupName}</span>
                                  </td>
                                  <td className={`p-3 text-right ${isT1Winner ? 'font-bold text-green-700' : ''}`}>{m.team1?.name || 'TBD'} <span className="block text-xs font-normal text-gray-500">{m.team1?.club}</span></td>
                                  <td className="p-3 text-center bg-gray-50 border-x">
                                     {m.team1?.isBye || m.team2?.isBye ? <span className="text-gray-400 italic">BYE</span> : renderScore(m.score)}
                                  </td>
                                  <td className={`p-3 text-left ${isT2Winner ? 'font-bold text-green-700' : ''}`}>{m.team2?.name || 'TBD'} <span className="block text-xs font-normal text-gray-500">{m.team2?.club}</span></td>
                                </tr>
                              )})}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                 })}
               </div>
            </div>
          )}

          {/* TAB 4: K.O. BRACKET */}
          {activeTab === 'bracket' && (
             <div className="overflow-x-auto pb-12">
               {['U50', 'O50'].map(cat => {
                 if (!brackets[cat]) return null;
                 
                 const getMatchData = (id) => matches.find(m => m.id === id);
                 
                 const MatchBox = ({ match, title }) => {
                   if (!match) return <div className="w-64 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 text-sm m-2">TBD</div>;
                   
                   return (
                     <div className="w-64 border border-gray-300 rounded-xl bg-white shadow-sm overflow-hidden m-2 print:border-gray-400 print:shadow-none break-inside-avoid">
                        <div className="bg-gray-100 text-xs text-center py-1 font-bold text-gray-600 border-b">{title || match.groupName}</div>
                        <div className={`p-2 border-b flex justify-between ${match.winnerId === match.team1?.id ? 'bg-green-50 font-bold' : ''}`}>
                          <span className="truncate pr-2">{match.team1?.name || 'TBD'}</span>
                          <span>{match.score?.s1[0]} {match.score?.s2[0]}</span>
                        </div>
                        <div className={`p-2 flex justify-between ${match.winnerId === match.team2?.id ? 'bg-green-50 font-bold' : ''}`}>
                          <span className="truncate pr-2">{match.team2?.name || 'TBD'}</span>
                          <span>{match.score?.s1[1]} {match.score?.s2[1]}</span>
                        </div>
                     </div>
                   );
                 };

                 return (
                   <div key={cat} className="mb-16 page-break-after">
                      <h2 className="text-2xl font-bold text-blue-900 mb-8 border-b-2 border-blue-900 pb-2 inline-block">Main Bracket: {CATEGORIES[cat]}</h2>
                      
                      {/* Flexbox Tree Visualization */}
                      <div className="flex items-center space-x-12 min-w-max">
                        {/* Quarter Finals */}
                        <div className="flex flex-col justify-around space-y-4 h-[600px]">
                           {brackets[cat].qf.map((qf, i) => (
                             <div key={i} className="relative">
                               <MatchBox match={getMatchData(qf.id)} title={`Quarter-Final ${i+1}`} />
                               <div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div>
                             </div>
                           ))}
                        </div>
                        
                        {/* Semi Finals */}
                        <div className="flex flex-col justify-around h-[600px]">
                           {brackets[cat].sf.map((sf, i) => (
                             <div key={i} className="relative">
                               <div className="absolute top-[-100px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-lg"></div>
                               <div className="absolute bottom-[-100px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-lg"></div>
                               <div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div>
                               <MatchBox match={getMatchData(sf.id)} title={sf.title} />
                               <div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div>
                             </div>
                           ))}
                        </div>

                        {/* Final */}
                        <div className="flex flex-col justify-center h-[600px]">
                           <div className="relative">
                               <div className="absolute top-[-150px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-lg"></div>
                               <div className="absolute bottom-[-150px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-lg"></div>
                               <div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div>
                               <MatchBox match={getMatchData(brackets[cat].final.id)} title="CHAMPIONSHIP" />
                           </div>
                        </div>
                      </div>

                      {/* Placement Matches */}
                      <h3 className="text-xl font-bold text-gray-700 mt-12 mb-4 border-b pb-2">Placement Matches</h3>
                      <div className="flex flex-wrap">
                         {brackets[cat].placements.map((place, i) => (
                           <MatchBox key={i} match={getMatchData(place.id)} title={place.title} />
                         ))}
                      </div>
                   </div>
                 )
               })}
             </div>
          )}

        </div>
      </main>

      {/* --- SCORE ENTRY MODAL --- */}
      {scoreModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 print:hidden p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-900 p-4 flex justify-between items-center text-white">
               <h3 className="font-bold">Enter Match Score</h3>
               <button onClick={() => setScoreModal(null)}><X size={20}/></button>
            </div>
            
            <form onSubmit={(e) => {
               e.preventDefault();
               const fd = new FormData(e.target);
               handleSaveScore(scoreModal.id, 
                 [parseInt(fd.get('s1_t1')||0), parseInt(fd.get('s1_t2')||0)],
                 [parseInt(fd.get('s2_t1')||0), parseInt(fd.get('s2_t2')||0)],
                 [parseInt(fd.get('tb_t1')||0), parseInt(fd.get('tb_t2')||0)]
               );
            }} className="p-6">
              
              <div className="flex justify-between items-end mb-4 font-bold text-sm text-gray-500 border-b pb-2">
                <div className="w-1/2">Teams</div>
                <div className="w-12 text-center">Set 1</div>
                <div className="w-12 text-center">Set 2</div>
                <div className="w-12 text-center text-orange-500">TieBrk</div>
              </div>

              {/* Team 1 Row */}
              <div className="flex justify-between items-center mb-4">
                <div className="w-1/2 font-semibold text-blue-900 truncate pr-2">{scoreModal.team1?.name}</div>
                <input name="s1_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[0]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required />
                <input name="s2_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[0]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required />
                <input name="tb_t1" type="number" min="0" max="20" defaultValue={scoreModal.score?.tb[0]} className="w-12 p-2 border rounded text-center font-bold bg-orange-50 text-orange-700" />
              </div>

              {/* Team 2 Row */}
              <div className="flex justify-between items-center mb-8">
                <div className="w-1/2 font-semibold text-blue-900 truncate pr-2">{scoreModal.team2?.name}</div>
                <input name="s1_t2" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[1]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required />
                <input name="s2_t2" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[1]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required />
                <input name="tb_t2" type="number" min="0" max="20" defaultValue={scoreModal.score?.tb[1]} className="w-12 p-2 border rounded text-center font-bold bg-orange-50 text-orange-700" />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center">
                 <CheckCircle size={18} className="mr-2" /> Save Result
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embedded CSS for Print Formatting */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; -webkit-print-color-adjust: exact; }
          .page-break-after { page-break-after: always; }
          .break-inside-avoid { break-inside: avoid; }
          @page { size: A3 landscape; margin: 1cm; }
        }
      `}} />
    </div>
  );
}