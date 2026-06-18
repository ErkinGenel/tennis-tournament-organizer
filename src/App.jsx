import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users, Calendar, Trophy, GitCommit, Printer, PlusCircle,
  Play, CheckCircle, X, Lock, Loader2, FastForward,
  Trash2, Edit2, Download, Upload, Clock, Award
} from 'lucide-react';

// --- Constants & Config ---
const COURTS = 6;
const CATEGORIES = { U50: 'Herren unter 50', O50: 'Herren über 50' };
const LEVELS = [3, 2, 1]; 

const MOCK_CLUBS = ['TC Wannweil', 'TC Reutlingen', 'TC Tübingen', 'TC Metzingen', 'TC Pfullingen', 'TV Kirchentellinsfurt'];
const MOCK_FIRST_NAMES = ['Lukas', 'Maximilian', 'Jonas', 'Paul', 'Leon', 'Finn', 'Elias', 'Ben', 'Luis', 'Felix', 'Markus', 'Thomas', 'Michael', 'Andreas', 'Stefan', 'Christian', 'Martin', 'Daniel'];
const MOCK_LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer'];

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateTimeSlots = (startStr, count = 15) => {
  let [h, m] = startStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) { h=9; m=30; }
  let slots = [];
  for(let i=0; i<count; i++){
    slots.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
    m += 90;
    h += Math.floor(m/60);
    m = m % 60;
    if(h>=24) h-=24;
  }
  return slots;
};

const generateRandomScore = () => {
  const setScores = [ [6,4], [6,3], [6,2], [6,1], [7,5], [7,6], [6,0] ];
  const s1 = Math.random() > 0.5 ? getRandom(setScores) : [...getRandom(setScores)].reverse();
  const s2 = Math.random() > 0.5 ? getRandom(setScores) : [...getRandom(setScores)].reverse();
  
  let tb = null;
  let winnerIdx; 
  if (s1[0]>s1[1] && s2[0]>s2[1]) winnerIdx = 1;
  else if (s1[1]>s1[0] && s2[1]>s2[0]) winnerIdx = 2;
  else {
     const tbp1Wins = Math.random() > 0.5;
     tb = tbp1Wins ? [10, getRandom([8,7,6,5,4])] : [getRandom([8,7,6,5,4]), 10];
     winnerIdx = tbp1Wins ? 1 : 2;
  }
  return { s1, s2, tb, winnerIdx };
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('tennis_auth') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [activeTab, setActiveTab] = useState('registration');
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState({ U50: {}, O50: {} });
  const [matches, setMatches] = useState([]);
  const [brackets, setBrackets] = useState({ U50: null, O50: null });
  
  const [day1Start, setDay1Start] = useState('09:30');
  const [day2Start, setDay2Start] = useState('09:30');

  const [regForm, setRegForm] = useState({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  const [scoreModal, setScoreModal] = useState(null);
  const [showKoOptions, setShowKoOptions] = useState(false);
  
  const [simState, setSimState] = useState('idle');

  // --- Authentication ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'wannweil') {
      sessionStorage.setItem('tennis_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect password.');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regForm.p1Name || !regForm.p1Club) return;
    
    const name = regForm.p2Name ? `${regForm.p1Name} / ${regForm.p2Name}` : regForm.p1Name;
    const clubs = [...new Set([regForm.p1Club, regForm.p2Club].filter(c => c && c.trim() !== ''))];
    const clubStr = clubs.join(' / ');
    
    const newTeamData = { 
      id: editingId || generateId(), 
      name, club: clubStr, clubs, 
      level: parseInt(regForm.level), category: regForm.category, 
      ...regForm 
    };

    if (editingId) {
      setTeams(teams.map(t => t.id === editingId ? newTeamData : t));
      setEditingId(null);
    } else {
      setTeams([...teams, newTeamData]);
    }
    
    setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });
    setGroups({ U50: {}, O50: {} }); setMatches([]); setBrackets({ U50: null, O50: null });
  };

  const handleEditTeam = (team) => {
    setRegForm({ 
      p1Name: team.p1Name || '', p1Club: team.p1Club || '', 
      p2Name: team.p2Name || '', p2Club: team.p2Club || '', 
      level: team.level.toString(), category: team.category 
    });
    setEditingId(team.id);
  };

  const handleDeleteTeam = (id) => {
    setTeams(teams.filter(t => t.id !== id));
    if (editingId === id) { setEditingId(null); setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' }); }
    setGroups({ U50: {}, O50: {} }); setMatches([]); setBrackets({ U50: null, O50: null });
  };

  const loadMockData = () => {
    const mockTeams = [];
    ['U50', 'O50'].forEach(category => {
      for (let i = 0; i < 12; i++) {
        const p1c = getRandom(MOCK_CLUBS);
        const p2c = Math.random() > 0.5 ? p1c : getRandom(MOCK_CLUBS);
        const p1n = `${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)}`;
        const p2n = `${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)}`;
        mockTeams.push({ 
          id: generateId(), 
          p1Name: p1n, p1Club: p1c, p2Name: p2n, p2Club: p2c,
          name: `${p1n} / ${p2n}`,
          club: p1c === p2c ? p1c : `${p1c} / ${p2c}`,
          clubs: [...new Set([p1c, p2c])],
          level: getRandom(LEVELS), category 
        });
      }
    });
    setTeams(mockTeams);
    setGroups({ U50: {}, O50: {} }); setMatches([]); setBrackets({ U50: null, O50: null });
  };

  const handleExportTournament = () => {
    const exportData = { teams, groups, matches, brackets, day1Start, day2Start };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", "tennis_tournament.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportTournament = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          setTeams(importedData); setGroups({ U50: {}, O50: {} }); setMatches([]); setBrackets({ U50: null, O50: null }); setActiveTab('registration');
        } else if (importedData && importedData.teams) {
          setTeams(importedData.teams || []);
          setGroups(importedData.groups || { U50: {}, O50: {} });
          setMatches(importedData.matches || []);
          setBrackets(importedData.brackets || { U50: null, O50: null });
          if (importedData.day1Start) setDay1Start(importedData.day1Start);
          if (importedData.day2Start) setDay2Start(importedData.day2Start);
          
          if (importedData.brackets && (importedData.brackets.U50 || importedData.brackets.O50)) setActiveTab('bracket');
          else if (importedData.matches && importedData.matches.length > 0) setActiveTab('schedule');
          else if (Object.keys(importedData.groups?.U50 || {}).length > 0) setActiveTab('groups');
          else setActiveTab('registration');
        }
        setEditingId(null);
      } catch (error) {
        console.error("Invalid file format", error); alert("Error loading file. Please ensure it is a valid tournament file.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const generateGroups = () => {
    const newGroups = { U50: {}, O50: {} };
    ['U50', 'O50'].forEach(cat => {
      const catTeams = teams.filter(t => t.category === cat).sort((a, b) => b.level - a.level);
      const numGroups = Math.ceil(catTeams.length / 4) || 1;
      const groupArrays = Array.from({ length: numGroups }, () => []);
      let dir = 1; let gIndex = 0;
      const unassigned = [...catTeams];
      
      while (unassigned.length > 0) {
        let selectedIdx = 0;
        const currentGroupClubs = groupArrays[gIndex].flatMap(t => t.clubs || [t.club]);
        
        // Find a team where NEITHER player shares a club with ANYONE in the group
        const safeIdx = unassigned.findIndex(t => {
           const tClubs = t.clubs || [t.club];
           return !tClubs.some(c => currentGroupClubs.includes(c));
        });
        if (safeIdx !== -1) selectedIdx = safeIdx;
        
        const team = unassigned.splice(selectedIdx, 1)[0];
        groupArrays[gIndex].push(team);
        
        gIndex += dir;
        if (gIndex >= numGroups || gIndex < 0) { dir *= -1; gIndex += dir; }
      }
      groupArrays.forEach((arr, i) => newGroups[cat][`Group ${String.fromCharCode(65 + i)}`] = arr);
    });
    setGroups(newGroups); setMatches([]);
  };

  const generateSchedule = () => {
    let newMatches = []; let unassignedMatches = [];
    const d1Slots = generateTimeSlots(day1Start, 15);

    ['U50', 'O50'].forEach(cat => {
      Object.entries(groups[cat]).forEach(([groupName, groupTeams]) => {
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            unassignedMatches.push({
              id: generateId(), category: cat, stage: 'Group', groupName,
              team1: groupTeams[i], team2: groupTeams[j], score: null, winnerId: null
            });
          }
        }
      });
    });

    let scheduleState = {}; 
    unassignedMatches.forEach(match => {
      let day = 1; let slotIdx = 0; let assigned = false;
      while (!assigned) {
        let time = d1Slots[slotIdx];
        let slotKey = `${day}_${time}`;
        if (!scheduleState[slotKey]) scheduleState[slotKey] = { courtsUsed: 0, teams: new Set() };
        let slot = scheduleState[slotKey];
        if (slot.courtsUsed < COURTS && !slot.teams.has(match.team1.id) && !slot.teams.has(match.team2.id)) {
          match.day = day; match.time = time; match.court = slot.courtsUsed + 1;
          slot.courtsUsed++; slot.teams.add(match.team1.id); slot.teams.add(match.team2.id);
          assigned = true;
        } else {
          slotIdx++;
          if (slotIdx >= d1Slots.length) { slotIdx = 0; day++; }
        }
      }
      newMatches.push(match);
    });
    setMatches(newMatches);
  };

  const fillMissingScores = (stageFilter = '', groupFilter = '') => {
    setMatches(prev => prev.map(m => {
      const isStageMatch = stageFilter === '' || m.stage === stageFilter;
      const isGroupMatch = groupFilter === '' || m.groupName.includes(groupFilter);
      if (m.score || m.winnerId || !m.team1 || !m.team2 || m.team1.name === 'BYE' || m.team2.name === 'BYE' || !isStageMatch || !isGroupMatch) return m;
      const randomData = generateRandomScore();
      return { ...m, score: { s1: randomData.s1, s2: randomData.s2, tb: randomData.tb }, winnerId: randomData.winnerIdx === 1 ? m.team1.id : m.team2.id };
    }));
  };

  const handleSaveScore = (matchId, s1, s2, tb) => {
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m;
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
    teams.forEach(t => { stats[t.id] = { ...t, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 }; });

    matches.filter(m => m.stage === 'Group' && m.score).forEach(m => {
      const { s1, s2, tb } = m.score;
      const t1 = stats[m.team1.id]; const t2 = stats[m.team2.id];
      if(!t1 || !t2) return;
      t1.played++; t2.played++;
      if (m.winnerId === t1.id) { t1.won++; t2.lost++; } else if (m.winnerId === t2.id) { t2.won++; t1.lost++; }
      const addStats = (teamStats, oppStats, scoreArr) => {
        if (!scoreArr || scoreArr.length !== 2) return;
        teamStats.gamesWon += scoreArr[0] || 0; teamStats.gamesLost += scoreArr[1] || 0;
        oppStats.gamesWon += scoreArr[1] || 0; oppStats.gamesLost += scoreArr[0] || 0;
        if ((scoreArr[0] || 0) > (scoreArr[1] || 0)) { teamStats.setsWon++; oppStats.setsLost++; }
        else if ((scoreArr[1] || 0) > (scoreArr[0] || 0)) { oppStats.setsWon++; teamStats.setsLost++; }
      };
      addStats(t1, t2, s1); addStats(t1, t2, s2);
      if (tb && (tb[0] > 0 || tb[1] > 0)) addStats(t1, t2, tb);
    });

    const calculatedStandings = { U50: {}, O50: {} };
    ['U50', 'O50'].forEach(cat => {
      Object.entries(groups[cat]).forEach(([gName, gTeams]) => {
        calculatedStandings[cat][gName] = gTeams.map(t => stats[t.id]).sort((a, b) => {
          if (b.won !== a.won) return b.won - a.won;
          const aSetDiff = a.setsWon - a.setsLost; const bSetDiff = b.setsWon - b.setsLost;
          if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
          return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
        });
      });
    });
    return calculatedStandings;
  }, [teams, groups, matches]);

  const handleGenerateKOClick = () => {
    let maxGroups = 0;
    ['U50', 'O50'].forEach(cat => { const c = Object.keys(groups[cat] || {}).length; if (c > maxGroups) maxGroups = c; });
    if (maxGroups > 0 && maxGroups <= 2) setShowKoOptions(true); else generateKO(2);
  };

  const generateKO = (advanceCount = 2) => {
    const newBrackets = { U50: null, O50: null };
    const allKoMatches = [];
    const d2Slots = generateTimeSlots(day2Start, 15);

    ['U50', 'O50'].forEach(cat => {
      let qualifiers = [];
      Object.values(standings[cat]).forEach(groupStandings => {
        if (groupStandings[0]) qualifiers.push({ ...groupStandings[0], seedType: '1st' });
        if (groupStandings[1]) qualifiers.push({ ...groupStandings[1], seedType: '2nd' });
        if (advanceCount >= 3 && groupStandings[2]) qualifiers.push({ ...groupStandings[2], seedType: '3rd' });
        if (advanceCount >= 4 && groupStandings[3]) qualifiers.push({ ...groupStandings[3], seedType: '4th' });
      });
      if (qualifiers.length === 0) return;

      qualifiers.sort((a, b) => {
        const seedRank = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
        if (seedRank[a.seedType] !== seedRank[b.seedType]) return seedRank[a.seedType] - seedRank[b.seedType];
        if (b.won !== a.won) return b.won - a.won;
        return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
      });

      while (qualifiers.length < 8) qualifiers.push({ isBye: true, name: 'BYE' });

      const cm = {
        qf1: { id: `qf1_${cat}`, category: cat, stage: 'KO', groupName: 'Quarter-Final 1', team1: qualifiers[0], team2: qualifiers[7], nextMatchId: `sf1_${cat}`, nextLoserMatchId: `psf1_${cat}` },
        qf2: { id: `qf2_${cat}`, category: cat, stage: 'KO', groupName: 'Quarter-Final 2', team1: qualifiers[3], team2: qualifiers[4], nextMatchId: `sf1_${cat}`, nextLoserMatchId: `psf1_${cat}` },
        qf3: { id: `qf3_${cat}`, category: cat, stage: 'KO', groupName: 'Quarter-Final 3', team1: qualifiers[2], team2: qualifiers[5], nextMatchId: `sf2_${cat}`, nextLoserMatchId: `psf2_${cat}` },
        qf4: { id: `qf4_${cat}`, category: cat, stage: 'KO', groupName: 'Quarter-Final 4', team1: qualifiers[1], team2: qualifiers[6], nextMatchId: `sf2_${cat}`, nextLoserMatchId: `psf2_${cat}` },
        sf1: { id: `sf1_${cat}`, title: 'Semi-Final 1', category: cat, stage: 'KO', groupName: 'Semi-Final 1', team1: null, team2: null, nextMatchId: `final_${cat}`, nextLoserMatchId: `place_3_${cat}` },
        sf2: { id: `sf2_${cat}`, title: 'Semi-Final 2', category: cat, stage: 'KO', groupName: 'Semi-Final 2', team1: null, team2: null, nextMatchId: `final_${cat}`, nextLoserMatchId: `place_3_${cat}` },
        psf1: { id: `psf1_${cat}`, title: 'Placement SF 1 (5-8)', category: cat, stage: 'Placement', groupName: 'Placement SF 1 (5-8)', team1: null, team2: null, nextMatchId: `place_5_${cat}`, nextLoserMatchId: `place_7_${cat}` },
        psf2: { id: `psf2_${cat}`, title: 'Placement SF 2 (5-8)', category: cat, stage: 'Placement', groupName: 'Placement SF 2 (5-8)', team1: null, team2: null, nextMatchId: `place_5_${cat}`, nextLoserMatchId: `place_7_${cat}` },
        final: { id: `final_${cat}`, title: 'Grand Final', category: cat, stage: 'KO', groupName: 'Grand Final', team1: null, team2: null, nextMatchId: null, nextLoserMatchId: null },
        place_3: { id: `place_3_${cat}`, title: '3rd Place Match', category: cat, stage: 'Placement', groupName: '3rd Place Match', team1: null, team2: null, nextMatchId: null, nextLoserMatchId: null },
        place_5: { id: `place_5_${cat}`, title: '5th Place Match', category: cat, stage: 'Placement', groupName: '5th Place Match', team1: null, team2: null, nextMatchId: null, nextLoserMatchId: null },
        place_7: { id: `place_7_${cat}`, title: '7th Place Match', category: cat, stage: 'Placement', groupName: '7th Place Match', team1: null, team2: null, nextMatchId: null, nextLoserMatchId: null },
      };

      const pushTeam = (m, team, isWinner) => {
        const targetId = isWinner ? m.nextMatchId : m.nextLoserMatchId;
        if (!targetId) return;
        const targetKey = Object.keys(cm).find(k => cm[k].id === targetId);
        if (!targetKey) return;
        const targetM = cm[targetKey];
        if (!targetM.team1) targetM.team1 = team;
        else targetM.team2 = team;
      };

      const resolveByes = (keys) => {
        keys.forEach(k => {
          const m = cm[k];
          if (m.team1 && m.team2) {
            if (m.team1.isBye && m.team2.isBye) {
              m.winnerId = m.team1.id; pushTeam(m, m.team1, true); pushTeam(m, m.team2, false);
            } else if (m.team1.isBye || m.team2.isBye) {
              const winner = m.team1.isBye ? m.team2 : m.team1;
              const loser = m.team1.isBye ? m.team1 : m.team2;
              m.winnerId = winner.id; pushTeam(m, winner, true); pushTeam(m, loser, false);
            }
          }
        });
      };

      resolveByes(['qf1', 'qf2', 'qf3', 'qf4']);
      resolveByes(['sf1', 'sf2', 'psf1', 'psf2']);
      resolveByes(['final', 'place_3', 'place_5', 'place_7']);

      newBrackets[cat] = {
        qf: [cm.qf1, cm.qf2, cm.qf3, cm.qf4],
        sf: [cm.sf1, cm.sf2],
        final: cm.final,
        psf: [cm.psf1, cm.psf2],
        placements: [cm.place_3, cm.place_5, cm.place_7]
      };

      Object.values(cm).forEach(m => {
        allKoMatches.push({ ...m, score: null, winnerId: m.winnerId || null, day: 2, time: 'TBD', court: '-' });
      });
    });

    let scheduleState = {}; 
    let day = 2; let slotIdx = 0;
    
    const rounds = [
      allKoMatches.filter(m => m.id.startsWith('qf')),
      allKoMatches.filter(m => m.id.startsWith('sf') || m.id.startsWith('psf')),
      allKoMatches.filter(m => m.id.startsWith('final') || m.id.startsWith('place'))
    ];
    
    rounds.forEach(roundMatches => {
      const realMatches = roundMatches.filter(m => !m.winnerId);
      realMatches.forEach(match => {
        let assigned = false;
        while (!assigned) {
          let time = d2Slots[slotIdx];
          let slotKey = `${day}_${time}`;
          if (!scheduleState[slotKey]) scheduleState[slotKey] = { courtsUsed: 0 };
          if (scheduleState[slotKey].courtsUsed < COURTS) {
            match.time = time; match.court = scheduleState[slotKey].courtsUsed + 1;
            scheduleState[slotKey].courtsUsed++; assigned = true;
          } else {
            slotIdx++; if (slotIdx >= d2Slots.length) { slotIdx = 0; day++; }
          }
        }
      });
      if (realMatches.length > 0) { slotIdx++; if (slotIdx >= d2Slots.length) { slotIdx = 0; day++; } }
    });

    allKoMatches.forEach(m => { if (m.winnerId) { m.time = 'BYE'; m.court = '-'; } });
    setBrackets(newBrackets);
    setMatches([...matches.filter(m => m.stage === 'Group'), ...allKoMatches]);
  };

  useEffect(() => {
    if (!brackets.U50 && !brackets.O50) return;
    let updatedMatches = [...matches];
    let changesMade = false;

    updatedMatches.forEach(m => {
       if (!m.winnerId && m.team1 && m.team2) {
           if (m.team1.isBye && m.team2.isBye) { m.winnerId = m.team1.id; changesMade = true; } 
           else if (m.team1.isBye || m.team2.isBye) { m.winnerId = m.team1.isBye ? m.team2.id : m.team1.id; changesMade = true; }
       }
    });

    const pushToNextRound = (matchId, winnerTeam, loserTeam) => {
       const match = updatedMatches.find(m => m.id === matchId);
       if (!match) return;
       if (match.nextMatchId && winnerTeam) {
         let nextMatch = updatedMatches.find(m => m.id === match.nextMatchId);
         if (nextMatch && nextMatch.team1?.id !== winnerTeam.id && nextMatch.team2?.id !== winnerTeam.id) {
            if (!nextMatch.team1) nextMatch.team1 = winnerTeam; else if (!nextMatch.team2) nextMatch.team2 = winnerTeam;
            changesMade = true;
         }
       }
       if (match.nextLoserMatchId && loserTeam) {
         let nextLoserM = updatedMatches.find(m => m.id === match.nextLoserMatchId);
         if (nextLoserM && nextLoserM.team1?.id !== loserTeam.id && nextLoserM.team2?.id !== loserTeam.id) {
            if (!nextLoserM.team1) nextLoserM.team1 = loserTeam; else if (!nextLoserM.team2) nextLoserM.team2 = loserTeam;
            changesMade = true;
         }
       }
    };

    updatedMatches.forEach(m => {
       if ((m.stage === 'KO' || m.stage === 'Placement') && m.winnerId) {
           const winner = m.winnerId === m.team1?.id ? m.team1 : m.team2;
           const loser = m.winnerId === m.team1?.id ? m.team2 : m.team1;
           pushToNextRound(m.id, winner, loser);
       }
    });
    if (changesMade) setMatches(updatedMatches);
  }, [matches, brackets]);

  const finalRankings = useMemo(() => {
    const rankings = { U50: [], O50: [] };
    ['U50', 'O50'].forEach(cat => {
      if (!brackets[cat] || matches.length === 0) return;
      const catM = matches.filter(m => m.category === cat);
      
      const getWinner = (id) => {
        const m = catM.find(x => x.id === id);
        if (!m || !m.winnerId) return null;
        return m.winnerId === m.team1?.id ? m.team1 : m.team2;
      };
      
      const getLoser = (id) => {
        const m = catM.find(x => x.id === id);
        if (!m || !m.winnerId) return null;
        return m.winnerId === m.team1?.id ? m.team2 : m.team1;
      };

      const r = [];
      const addRank = (team, rank) => { if (team && !r.find(x => x.team.id === team.id)) r.push({ rank, team }); };

      // Top 8 from K.O. Matches
      addRank(getWinner(`final_${cat}`), 1); addRank(getLoser(`final_${cat}`), 2);
      addRank(getWinner(`place_3_${cat}`), 3); addRank(getLoser(`place_3_${cat}`), 4);
      addRank(getWinner(`place_5_${cat}`), 5); addRank(getLoser(`place_5_${cat}`), 6);
      addRank(getWinner(`place_7_${cat}`), 7); addRank(getLoser(`place_7_${cat}`), 8);

      // Remaining from group standings
      let remaining = [];
      Object.values(standings[cat] || {}).forEach(grp => {
        grp.forEach(t => { if (!r.find(x => x.team.id === t.id)) remaining.push(t); });
      });
      
      remaining.sort((a,b) => {
         const getPos = (team) => {
           for(const g in standings[cat]){
             const idx = standings[cat][g].findIndex(x => x.id === team.id);
             if(idx !== -1) return idx;
           }
           return 99;
         };
         const posA = getPos(a); const posB = getPos(b);
         if(posA !== posB) return posA - posB;
         if(b.won !== a.won) return b.won - a.won;
         const sDiffA = a.setsWon - a.setsLost; const sDiffB = b.setsWon - b.setsLost;
         if(sDiffB !== sDiffA) return sDiffB - sDiffA;
         return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
      });

      remaining.forEach((t) => addRank(t, r.length + 1));
      rankings[cat] = r;
    });
    return rankings;
  }, [matches, brackets, standings]);

  const handleSimulateTournament = () => { if (simState === 'idle') setSimState('init'); };

  useEffect(() => {
    if (simState === 'idle') return;
    const timer = setTimeout(() => {
      switch (simState) {
        case 'init': loadMockData(); setActiveTab('registration'); setSimState('groups'); break;
        case 'groups': generateGroups(); setActiveTab('groups'); setSimState('schedule'); break;
        case 'schedule': generateSchedule(); setActiveTab('schedule'); setSimState('group_scores'); break;
        case 'group_scores': fillMissingScores('Group'); setActiveTab('groups'); setSimState('ko'); break;
        case 'ko': const maxG = Math.max(Object.keys(groups.U50).length, Object.keys(groups.O50).length); generateKO(maxG <= 2 ? 3 : 2); setActiveTab('bracket'); setSimState('ko_qf_scores'); break;
        case 'ko_qf_scores': fillMissingScores('KO', 'Quarter-Final'); setSimState('ko_sf_scores'); break;
        case 'ko_sf_scores': fillMissingScores('KO', 'Semi-Final'); fillMissingScores('Placement', 'Placement SF'); setSimState('ko_final_scores'); break;
        case 'ko_final_scores': fillMissingScores('KO', 'Grand Final'); fillMissingScores('Placement', 'Place Match'); setActiveTab('rankings'); setSimState('idle'); break;
        default: setSimState('idle');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [simState]);

  const renderScore = (score) => {
    if (!score) return <span className="text-gray-400">vs</span>;
    let text = `${score.s1[0]}:${score.s1[1]} | ${score.s2[0]}:${score.s2[1]}`;
    if (score.tb && (score.tb[0] > 0 || score.tb[1] > 0)) text += ` | [${score.tb[0]}:${score.tb[1]}]`;
    return <span className="font-semibold text-blue-700">{text}</span>;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-gray-200">
          <div className="flex justify-center mb-6"><div className="bg-blue-100 p-4 rounded-full"><Lock className="h-10 w-10 text-blue-800" /></div></div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Tournament Access</h2>
          <p className="text-center text-gray-500 text-sm mb-6">Password: wannweil</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Enter Password" required />
            {authError && <p className="text-red-500 text-sm text-center font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-blue-700 text-white p-3 rounded-lg font-bold hover:bg-blue-800">Unlock Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
      <header className="bg-blue-900 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold hidden sm:block">Tennis Tournament Organizer</h1>
          </div>
          <div className="flex space-x-2 items-center">
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportTournament} />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 px-3 py-2 rounded-lg transition text-sm font-medium" title="Load Save File"><Upload size={16} /> <span className="hidden lg:inline">Load</span></button>
            <button onClick={handleExportTournament} disabled={teams.length === 0} className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 px-3 py-2 rounded-lg transition text-sm font-medium disabled:opacity-50" title="Download Save File"><Download size={16} /> <span className="hidden lg:inline">Save</span></button>
            <div className="w-px h-6 bg-blue-700 mx-1 hidden sm:block"></div>
            <button onClick={handleSimulateTournament} disabled={simState !== 'idle'} className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-bold transition shadow-sm ${simState !== 'idle' ? 'bg-purple-800 text-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white animate-pulse'}`}>
              {simState !== 'idle' ? <><Loader2 size={16} className="animate-spin" /> <span className="hidden md:inline">Simulating...</span></> : <><FastForward size={16} /> <span className="hidden md:inline">Simulate</span></>}
            </button>
            <button onClick={() => window.print()} className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded-lg transition text-sm font-bold"><Printer size={16} /> <span className="hidden md:inline">Print A3</span></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-8 print:hidden overflow-x-auto">
          {[
            { id: 'registration', icon: Users, label: 'Registration' },
            { id: 'groups', icon: GitCommit, label: 'Groups' },
            { id: 'schedule', icon: Calendar, label: 'Schedule' },
            { id: 'bracket', icon: Trophy, label: 'Brackets' },
            { id: 'rankings', icon: Award, label: 'Rankings' }
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 min-w-[120px] flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'}`}>
              <t.icon size={18} /> <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:border-none print:shadow-none print:p-0">
          
          {/* TAB 1: REGISTRATION */}
          {activeTab === 'registration' && (
            <div className="space-y-8 print:hidden">
              <div className="flex justify-between items-center bg-blue-50 p-6 rounded-xl border border-blue-100 flex-wrap gap-4">
                <div><h2 className="text-xl font-bold text-blue-900">Tournament Setup</h2><p className="text-blue-700 text-sm mt-1">Register teams manually or load mock data.</p></div>
                <button onClick={loadMockData} className="flex items-center space-x-2 bg-white text-blue-700 border border-blue-200 px-5 py-2 rounded-lg shadow-sm hover:bg-blue-50 font-medium"><Play size={18} /> <span>Load Mock Teams</span></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200 h-fit">
                  <h3 className="font-bold text-lg mb-4 flex items-center">{editingId ? <><Edit2 size={18} className="mr-2 text-orange-600"/> Edit Team</> : <><PlusCircle size={18} className="mr-2 text-blue-600"/> New Team</>}</h3>
                  
                  <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h4 className="text-sm font-bold text-gray-700 flex items-center mb-3"><Clock size={16} className="mr-2 text-gray-500"/> Start Times</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs font-medium text-gray-500 mb-1">Day 1</label><input type="time" value={day1Start} onChange={e=>setDay1Start(e.target.value)} className="w-full p-2 border rounded-md text-sm font-medium focus:ring-blue-500" /></div>
                      <div><label className="block text-xs font-medium text-gray-500 mb-1">Day 2</label><input type="time" value={day2Start} onChange={e=>setDay2Start(e.target.value)} className="w-full p-2 border rounded-md text-sm font-medium focus:ring-blue-500" /></div>
                    </div>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="bg-white p-3 border border-gray-200 rounded-lg space-y-3">
                       <h4 className="text-xs font-bold text-gray-500 uppercase">Player 1</h4>
                       <input value={regForm.p1Name} onChange={e=>setRegForm({...regForm, p1Name: e.target.value})} className="w-full p-2 border rounded-md text-sm" placeholder="Name" required />
                       <input value={regForm.p1Club} onChange={e=>setRegForm({...regForm, p1Club: e.target.value})} className="w-full p-2 border rounded-md text-sm" placeholder="Club" required />
                    </div>
                    <div className="bg-white p-3 border border-gray-200 rounded-lg space-y-3">
                       <h4 className="text-xs font-bold text-gray-500 uppercase">Player 2 <span className="lowercase font-normal">(Optional)</span></h4>
                       <input value={regForm.p2Name} onChange={e=>setRegForm({...regForm, p2Name: e.target.value})} className="w-full p-2 border rounded-md text-sm" placeholder="Name" />
                       <input value={regForm.p2Club} onChange={e=>setRegForm({...regForm, p2Club: e.target.value})} className="w-full p-2 border rounded-md text-sm" placeholder="Club" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Level</label><select value={regForm.level} onChange={e=>setRegForm({...regForm, level: e.target.value})} className="w-full p-2 border rounded-md"><option value="3">3 - Adv</option><option value="2">2 - Int</option><option value="1">1 - Beg</option></select></div>
                      <div><label className="block text-sm font-medium mb-1">Category</label><select value={regForm.category} onChange={e=>setRegForm({...regForm, category: e.target.value})} className="w-full p-2 border rounded-md"><option value="U50">U50</option><option value="O50">O50</option></select></div>
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button type="submit" className={`flex-1 text-white py-2 rounded-md font-medium ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{editingId ? 'Update' : 'Register'}</button>
                      {editingId && <button type="button" onClick={() => { setEditingId(null); setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' }); }} className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-md hover:bg-gray-400 font-medium">Cancel</button>}
                    </div>
                  </form>
                </div>
                
                <div className="col-span-2">
                  <h3 className="font-bold text-lg mb-4">Registered Teams ({teams.length})</h3>
                  <div className="overflow-auto max-h-[600px] border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 sticky top-0 shadow-sm"><tr><th className="p-3 border-b">Team</th><th className="p-3 border-b">Club</th><th className="p-3 border-b">Category</th><th className="p-3 border-b">Level</th><th className="p-3 border-b text-center">Actions</th></tr></thead>
                      <tbody>
                        {teams.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-gray-500">No teams registered yet.</td></tr> : 
                         teams.map((t) => (
                          <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="p-3 font-medium">{t.name}</td><td className="p-3 text-xs text-gray-500">{t.club}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${t.category==='U50'?'bg-green-100 text-green-700':'bg-purple-100 text-purple-700'}`}>{CATEGORIES[t.category]}</span></td>
                            <td className="p-3"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Lvl {t.level}</span></td>
                            <td className="p-3 text-center">
                              <button onClick={() => handleEditTeam(t)} className="text-gray-500 hover:text-blue-600 mx-1 transition"><Edit2 size={16} /></button>
                              <button onClick={() => handleDeleteTeam(t.id)} className="text-gray-500 hover:text-red-600 mx-1 transition"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GROUPS */}
          {activeTab === 'groups' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center print:hidden">
                <p className="text-gray-600">Groups balanced by skill level and club affiliation.</p>
                <div className="space-x-3">
                   <button onClick={generateGroups} disabled={teams.length < 4} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium disabled:opacity-50">1. Re-Generate Groups</button>
                   <button onClick={generateSchedule} disabled={Object.keys(groups.U50).length === 0} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50">2. Generate Schedule</button>
                </div>
              </div>
              {['U50', 'O50'].map(cat => (
                 Object.keys(groups[cat]).length > 0 && (
                   <div key={cat} className="mb-10 page-break-after">
                     <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 flex items-center">{CATEGORIES[cat]} <span className="ml-3 text-sm bg-gray-200 px-2 py-1 rounded-full">{Object.keys(groups[cat]).length} Groups</span></h2>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(groups[cat]).map(([groupName, groupTeams]) => (
                          <div key={groupName} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-100 p-3 font-bold border-b border-gray-200">{groupName}</div>
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-500 uppercase text-xs"><tr><th className="px-4 py-2">Pos</th><th className="px-4 py-2">Team</th><th className="px-4 py-2 text-center">W-L</th><th className="px-4 py-2 text-center">Sets</th></tr></thead>
                              <tbody>
                                {(standings[cat][groupName] || groupTeams).map((t, index) => (
                                  <tr key={t.id} className="border-b last:border-0">
                                    <td className="px-4 py-3 font-bold text-gray-400">{index + 1}</td>
                                    <td className="px-4 py-3"><div className="font-medium text-gray-900 truncate max-w-[200px]" title={t.name}>{t.name}</div><div className="text-xs text-gray-500 truncate max-w-[200px]" title={t.club}>{t.club}</div></td>
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

          {/* TAB 3: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div>
               <div className="flex justify-between items-center mb-6 print:hidden">
                 <h2 className="text-xl font-bold">Match Schedule</h2>
                 <div className="flex space-x-3">
                   <button onClick={() => fillMissingScores('Group')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition">Auto-Fill Group Scores</button>
                   <button onClick={handleGenerateKOClick} disabled={matches.length === 0} className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium shadow-sm hover:bg-green-700 transition flex items-center"><Trophy size={18} className="mr-2"/> Gen K.O. Bracket (Day 2)</button>
                 </div>
               </div>

               <div className="space-y-8">
                 {[1, 2].map(day => {
                    const dayMatches = matches.filter(m => m.day === day && m.time !== 'BYE').sort((a,b) => a.time.localeCompare(b.time));
                    if (dayMatches.length === 0) return null;
                    return (
                      <div key={day} className="mb-8">
                        <h3 className="text-lg font-bold bg-blue-900 text-white p-3 rounded-t-xl">Day {day} {day===1 ? '(Group Stage)' : '(Finals & Placements)'}</h3>
                        <div className="border border-blue-900 rounded-b-xl overflow-hidden bg-white">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600"><tr><th className="p-3 text-left">Time</th><th className="p-3 text-left">Court</th><th className="p-3 text-left">Stage</th><th className="p-3 text-right w-1/3">Team 1</th><th className="p-3 text-center w-32">Score</th><th className="p-3 text-left w-1/3">Team 2</th></tr></thead>
                            <tbody>
                              {dayMatches.map((m) => {
                                const isT1Winner = m.winnerId === m.team1?.id; const isT2Winner = m.winnerId === m.team2?.id;
                                return (
                                <tr key={m.id} className="border-b last:border-0 hover:bg-blue-50 transition cursor-pointer" onClick={() => !m.team1?.isBye && !m.team2?.isBye && setScoreModal(m)}>
                                  <td className="p-3 font-bold text-gray-700">{m.time}</td>
                                  <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded-full text-xs font-bold">Crt {m.court}</span></td>
                                  <td className="p-3 text-xs"><span className="block font-bold text-blue-700">{CATEGORIES[m.category].substring(0,3)} {m.category}</span><span className="text-gray-500">{m.groupName}</span></td>
                                  <td className={`p-3 text-right ${isT1Winner ? 'font-bold text-green-700' : ''}`}><div className="truncate max-w-[150px] ml-auto" title={m.team1?.name}>{m.team1?.name || 'TBD'}</div> <span className="block text-xs font-normal text-gray-500 truncate max-w-[150px] ml-auto" title={m.team1?.club}>{m.team1?.club}</span></td>
                                  <td className="p-3 text-center bg-gray-50 border-x">{m.team1?.isBye || m.team2?.isBye ? <span className="text-gray-400 italic">BYE</span> : renderScore(m.score)}</td>
                                  <td className={`p-3 text-left ${isT2Winner ? 'font-bold text-green-700' : ''}`}><div className="truncate max-w-[150px]" title={m.team2?.name}>{m.team2?.name || 'TBD'}</div> <span className="block text-xs font-normal text-gray-500 truncate max-w-[150px]" title={m.team2?.club}>{m.team2?.club}</span></td>
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

          {/* TAB 4: BRACKETS */}
          {activeTab === 'bracket' && (
             <div className="overflow-x-auto pb-12">
               {['U50', 'O50'].map(cat => {
                 if (!brackets[cat]) return null;
                 const getMatchData = (id) => matches.find(m => m.id === id);
                 const MatchBox = ({ match, title }) => {
                   if (!match) return <div className="w-64 h-24 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 text-sm m-2">TBD</div>;
                   if (match.team1?.isBye && match.team2?.isBye) {
                      return (<div className="w-64 border border-gray-200 rounded-xl bg-gray-50 shadow-sm overflow-hidden m-2 opacity-60"><div className="bg-gray-100 text-xs text-center py-1 font-bold text-gray-500 border-b">{title || match.groupName}</div><div className="p-4 text-center font-bold text-gray-400 italic">No Match (BYE)</div></div>);
                   }
                   if (match.team1?.isBye || match.team2?.isBye) {
                      const realTeam = match.team1?.isBye ? match.team2 : match.team1;
                      return (<div className="w-64 border border-blue-200 rounded-xl bg-blue-50 shadow-sm overflow-hidden m-2 break-inside-avoid"><div className="bg-blue-100 text-xs text-center py-1 font-bold text-blue-800 border-b">{title || match.groupName}</div><div className="p-4 text-center"><span className="font-bold text-blue-900 block truncate">{realTeam?.name || 'TBD'}</span><span className="text-xs font-bold text-blue-600 uppercase mt-1 block">Advances (BYE)</span></div></div>);
                   }
                   return (
                     <div className="w-64 border border-gray-300 rounded-xl bg-white shadow-sm overflow-hidden m-2 print:border-gray-400 print:shadow-none break-inside-avoid">
                        <div className="bg-gray-100 text-xs text-center py-1 font-bold text-gray-600 border-b">{title || match.groupName}</div>
                        <div className={`p-2 border-b flex justify-between ${match.winnerId === match.team1?.id ? 'bg-green-50 font-bold' : ''}`}><span className="truncate pr-2">{match.team1?.name || 'TBD'}</span><span>{match.score?.s1[0]} {match.score?.s2[0]}</span></div>
                        <div className={`p-2 flex justify-between ${match.winnerId === match.team2?.id ? 'bg-green-50 font-bold' : ''}`}><span className="truncate pr-2">{match.team2?.name || 'TBD'}</span><span>{match.score?.s1[1]} {match.score?.s2[1]}</span></div>
                     </div>
                   );
                 };

                 return (
                   <div key={cat} className="mb-16 page-break-after">
                      <h2 className="text-2xl font-bold text-blue-900 mb-8 border-b-2 border-blue-900 pb-2 inline-block">Main Bracket: {CATEGORIES[cat]}</h2>
                      <div className="flex items-center space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-4 h-[600px]">{brackets[cat].qf.map((qf, i) => (<div key={i} className="relative"><MatchBox match={getMatchData(qf.id)} title={qf.title} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div></div>))}</div>
                        <div className="flex flex-col justify-around h-[600px]">{brackets[cat].sf.map((sf, i) => (<div key={i} className="relative"><div className="absolute top-[-100px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-lg"></div><div className="absolute bottom-[-100px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div><MatchBox match={getMatchData(sf.id)} title={sf.title} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div></div>))}</div>
                        <div className="flex flex-col justify-center h-[600px]"><div className="relative"><div className="absolute top-[-150px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-lg"></div><div className="absolute bottom-[-150px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div><MatchBox match={getMatchData(brackets[cat].final.id)} title="CHAMPIONSHIP" /></div></div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-700 mt-12 mb-4 border-b pb-2">Positions 5 - 8 Bracket</h3>
                      <div className="flex items-center space-x-12 min-w-max mb-8">
                         <div className="flex flex-col justify-around space-y-4 h-[300px]">{brackets[cat].psf.map((psf, i) => (<div key={i} className="relative"><MatchBox match={getMatchData(psf.id)} title={psf.title} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div></div>))}</div>
                         <div className="flex flex-col justify-center h-[300px]"><div className="relative"><div className="absolute top-[-75px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-lg"></div><div className="absolute bottom-[-75px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div><MatchBox match={getMatchData(`place_5_${cat}`)} title="5th Place Match" /></div></div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-700 mt-8 mb-4 border-b pb-2">Final Placement Matches</h3>
                      <div className="flex flex-wrap gap-4"><MatchBox match={getMatchData(`place_3_${cat}`)} title="3rd Place Match" /><MatchBox match={getMatchData(`place_7_${cat}`)} title="7th Place Match" /></div>
                   </div>
                 )
               })}
             </div>
          )}

          {/* TAB 5: FINAL RANKINGS */}
          {activeTab === 'rankings' && (
             <div className="space-y-8">
                <div className="flex justify-between items-center print:hidden mb-6">
                  <h2 className="text-xl font-bold">Tournament Rankings</h2>
                  <p className="text-gray-600 text-sm">Positions calculated from K.O. results and group performance.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {['U50', 'O50'].map(cat => {
                    if (!finalRankings[cat] || finalRankings[cat].length === 0) return null;
                    return (
                      <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm page-break-after">
                         <div className="bg-blue-900 text-white p-4 font-bold text-lg flex items-center justify-between"><span>{CATEGORIES[cat]}</span><Award className="text-yellow-400" /></div>
                         <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b"><tr><th className="p-3 text-center w-16">Rank</th><th className="p-3">Team</th><th className="p-3 text-right">Clubs</th></tr></thead>
                            <tbody>
                               {finalRankings[cat].map((item, idx) => (
                                  <tr key={item.team.id} className={`border-b last:border-0 hover:bg-gray-50 ${idx < 3 ? 'bg-yellow-50/30' : ''}`}>
                                     <td className="p-3 text-center font-bold">{idx === 0 ? <span className="text-yellow-600 text-lg flex justify-center"><Trophy size={20}/></span> : idx === 1 ? <span className="text-gray-400 text-lg">2</span> : idx === 2 ? <span className="text-amber-600 text-lg">3</span> : item.rank}</td>
                                     <td className={`p-3 ${idx === 0 ? 'font-bold text-blue-900' : 'font-medium text-gray-800'}`}><div className="truncate max-w-[200px] sm:max-w-[300px]" title={item.team.name}>{item.team.name}</div></td>
                                     <td className="p-3 text-right text-xs text-gray-500"><div className="truncate max-w-[120px] sm:max-w-[200px]" title={item.team.club}>{item.team.club}</div></td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                    )
                  })}
                </div>
             </div>
          )}

        </div>
      </main>

      {/* --- SCORE ENTRY MODAL --- */}
      {scoreModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 print:hidden p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-900 p-4 flex justify-between items-center text-white"><h3 className="font-bold">Enter Match Score</h3><button onClick={() => setScoreModal(null)}><X size={20}/></button></div>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleSaveScore(scoreModal.id, [parseInt(fd.get('s1_t1')||0), parseInt(fd.get('s1_t2')||0)], [parseInt(fd.get('s2_t1')||0), parseInt(fd.get('s2_t2')||0)], [parseInt(fd.get('tb_t1')||0), parseInt(fd.get('tb_t2')||0)]); }} className="p-6">
              <div className="flex justify-between items-end mb-4 font-bold text-sm text-gray-500 border-b pb-2"><div className="w-1/2">Teams</div><div className="w-12 text-center">Set 1</div><div className="w-12 text-center">Set 2</div><div className="w-12 text-center text-orange-500">TieBrk</div></div>
              <div className="flex justify-between items-center mb-4"><div className="w-1/2 font-semibold text-blue-900 truncate pr-2">{scoreModal.team1?.name}</div><input name="s1_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[0]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required /><input name="s2_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[0]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required /><input name="tb_t1" type="number" min="0" max="20" defaultValue={scoreModal.score?.tb[0]} className="w-12 p-2 border rounded text-center font-bold bg-orange-50 text-orange-700" /></div>
              <div className="flex justify-between items-center mb-8"><div className="w-1/2 font-semibold text-blue-900 truncate pr-2">{scoreModal.team2?.name}</div><input name="s1_t2" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[1]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required /><input name="s2_t2" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[1]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required /><input name="tb_t2" type="number" min="0" max="20" defaultValue={scoreModal.score?.tb[1]} className="w-12 p-2 border rounded text-center font-bold bg-orange-50 text-orange-700" /></div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center"><CheckCircle size={18} className="mr-2" /> Save Result</button>
            </form>
          </div>
        </div>
      )}

      {/* --- K.O. OPTIONS MODAL --- */}
      {showKoOptions && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 print:hidden p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-900 p-4 flex justify-between items-center text-white"><h3 className="font-bold">Configure K.O. Bracket</h3><button onClick={() => setShowKoOptions(false)}><X size={20}/></button></div>
            <div className="p-6 text-center">
              <p className="text-gray-700 mb-6 text-sm">With your current groups, qualifying only the <b>Top 2</b> teams will result in a mostly empty Quarter-Final round. <br/><br/>Would you like to advance the <b>Top 3</b> teams from each group instead to fill out the bracket and schedule more placement matches?</p>
              <div className="flex space-x-3">
                <button onClick={() => { setShowKoOptions(false); generateKO(3); }} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-sm transition">Advance Top 3</button>
                <button onClick={() => { setShowKoOptions(false); generateKO(2); }} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 transition">Keep Top 2</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `@media print { body { background: white; -webkit-print-color-adjust: exact; } .page-break-after { page-break-after: always; } .break-inside-avoid { break-inside: avoid; } @page { size: A3 landscape; margin: 1cm; } }`}} />
    </div>
  );
}
