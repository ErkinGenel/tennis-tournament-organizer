import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Calendar, Trophy, GitCommit, Printer, PlusCircle,
  Play, CheckCircle, ChevronRight, X, Lock, Loader2, FastForward,
  Trash2, Edit2, Download, Upload, Clock, Award, Tv, Monitor as MonitorIcon,
  Smartphone, LogOut, User
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
const generateTeamName = () => `${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)} / ${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)}`;

const generateTimeSlots = (startTimeStr, numSlots = 8) => {
  const slots = [];
  let [hours, minutes] = startTimeStr.split(':').map(Number);
  
  for (let i = 0; i < numSlots; i++) {
    slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    minutes += 90;
    if (minutes >= 60) {
      hours += Math.floor(minutes / 60);
      minutes = minutes % 60;
    }
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

const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

// --- Main Application Component ---
export default function App() {
  const [appMode, setAppMode] = useState(sessionStorage.getItem('tennis_auth') === 'true' ? 'organizer' : 'login');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggedInTeamId, setLoggedInTeamId] = useState(null);
  const [playerTab, setPlayerTab] = useState('matches'); // Mobile tab state
  
  const [activeTab, setActiveTab] = useState('registration');
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState({ U50: {}, O50: {} });
  const [matches, setMatches] = useState([]);
  const [brackets, setBrackets] = useState({ U50: null, O50: null });
  
  const [day1Start, setDay1Start] = useState('09:30');
  const [day2Start, setDay2Start] = useState('09:30');

  const [regForm, setRegForm] = useState({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });
  const [editingTeam, setEditingTeam] = useState(null);
  const [scoreModal, setScoreModal] = useState(null);
  
  // Simulation State
  const [simState, setSimState] = useState('idle');
  const [koQualifyCount, setKoQualifyCount] = useState(2); // Top 2 or Top 3

  // --- Monitor Sync & State Engine ---
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // 1. Organizer broadcasts data to the TV
  useEffect(() => {
    if (appMode === 'organizer') {
      const stateToSync = { teams, groups, matches, brackets, day1Start, day2Start };
      localStorage.setItem('tennis_tournament_sync', JSON.stringify(stateToSync));
    }
  }, [teams, groups, matches, brackets, day1Start, day2Start, appMode]);

  // 2. TV Monitor Data Sync
  useEffect(() => {
    if (appMode === 'monitor') {
      const loadSyncData = () => {
        const stored = localStorage.getItem('tennis_tournament_sync');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.teams) setTeams(parsed.teams);
          if (parsed.groups) setGroups(parsed.groups);
          if (parsed.matches) setMatches(parsed.matches);
          if (parsed.brackets) setBrackets(parsed.brackets);
          if (parsed.day1Start) setDay1Start(parsed.day1Start);
          if (parsed.day2Start) setDay2Start(parsed.day2Start);
        }
      };
      loadSyncData();

      const handleStorage = (e) => {
        if (e.key === 'tennis_tournament_sync') loadSyncData();
      };
      window.addEventListener('storage', handleStorage);

      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [appMode]);

  // 3. TV Monitor Clock
  useEffect(() => {
    if (appMode === 'monitor') {
      const clockInt = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
      return () => clearInterval(clockInt);
    }
  }, [appMode]);

  // 4. TV Monitor Dynamic Slideshow
  useEffect(() => {
    if (appMode === 'monitor') {
      let activeSlides = ['groups', 'schedule']; // Default rotation before KO stage
      
      const hasBrackets = brackets && (brackets.U50 || brackets.O50);
      if (hasBrackets) {
         // Check if the Grand Finals have been played
         const finals = matches.filter(m => m.id && m.id.startsWith('final_'));
         const isEnded = finals.length > 0 && finals.every(m => m.winnerId !== null);
         
         if (isEnded) {
           activeSlides = ['bracket', 'rankings']; // Tournament over: only show results
         } else {
           activeSlides = ['groups', 'schedule', 'bracket']; // KO Stage ongoing
         }
      }

      const rotateInt = setInterval(() => {
        setActiveTab(prev => {
           const currentIndex = activeSlides.indexOf(prev);
           // If current tab is not in the active slides (or we just switched phases), start at index 0
           const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % activeSlides.length;
           return activeSlides[nextIndex];
        });
      }, 15000); // Rotates every 15 seconds

      return () => clearInterval(rotateInt);
    }
  }, [appMode, matches, brackets]);

  // --- Authentication ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'wannweil') {
      sessionStorage.setItem('tennis_auth', 'true');
      setAppMode('organizer');
      setAuthError('');
    } else {
      // Check if it's a team PIN
      const foundTeam = teams.find(t => t.pin === passwordInput);
      if (foundTeam) {
        setAppMode('player');
        setLoggedInTeamId(foundTeam.id);
        setAuthError('');
      } else {
        setAuthError('Incorrect Password or Team PIN.');
      }
    }
  };

  // --- Registration & Mock Data ---
  const handleRegister = (e) => {
    e.preventDefault();
    if (!regForm.p1Name || !regForm.p2Name) return;
    
    const teamName = `${regForm.p1Name} / ${regForm.p2Name}`;
    const newTeam = { 
       id: editingTeam ? editingTeam.id : generateId(), 
       name: teamName, 
       p1Club: regForm.p1Club, 
       p2Club: regForm.p2Club, 
       clubs: [regForm.p1Club, regForm.p2Club].filter(c => c),
       level: parseInt(regForm.level),
       category: regForm.category,
       pin: editingTeam ? editingTeam.pin : generatePin()
    };

    if (editingTeam) {
       setTeams(teams.map(t => t.id === editingTeam.id ? newTeam : t));
       setEditingTeam(null);
    } else {
       setTeams([...teams, newTeam]);
    }
    
    setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });
    setGroups({ U50: {}, O50: {} });
    setMatches([]);
    setBrackets({ U50: null, O50: null });
  };

  const handleEdit = (team) => {
    const names = team.name.split(' / ');
    setRegForm({
      p1Name: names[0] || '', p2Name: names[1] || '',
      p1Club: team.clubs[0] || '', p2Club: team.clubs[1] || team.clubs[0] || '',
      level: team.level.toString(), category: team.category
    });
    setEditingTeam(team);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if(window.confirm('Delete this team?')) {
      setTeams(teams.filter(t => t.id !== id));
      setGroups({ U50: {}, O50: {} });
      setMatches([]);
      setBrackets({ U50: null, O50: null });
    }
  };

  const loadMockData = () => {
    const mockTeams = [];
    ['U50', 'O50'].forEach(category => {
      for (let i = 0; i < 12; i++) {
        const c1 = getRandom(MOCK_CLUBS);
        const c2 = Math.random() > 0.5 ? c1 : getRandom(MOCK_CLUBS);
        mockTeams.push({ 
           id: generateId(), name: generateTeamName(), 
           p1Club: c1, p2Club: c2, clubs: [c1, c2],
           level: getRandom(LEVELS), category,
           pin: generatePin()
        });
      }
    });
    setTeams(mockTeams);
    setGroups({ U50: {}, O50: {} });
    setMatches([]);
    setBrackets({ U50: null, O50: null });
  };

  const handleExportTournament = () => {
    const dataStr = JSON.stringify({ teams, groups, matches, brackets, day1Start, day2Start });
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tennis_tournament_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTournament = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
           setTeams(data);
        } else {
           if (data.teams) setTeams(data.teams);
           if (data.groups) setGroups(data.groups);
           if (data.matches) setMatches(data.matches);
           if (data.brackets) setBrackets(data.brackets);
           if (data.day1Start) setDay1Start(data.day1Start);
           if (data.day2Start) setDay2Start(data.day2Start);
           
           if (data.matches && data.matches.length > 0) setActiveTab('schedule');
        }
      } catch (err) {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // --- Core Tournament Logic ---
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
        const currentGroupClubs = groupArrays[gIndex].flatMap(t => t.clubs);
        const safeIdx = unassigned.findIndex(t => !t.clubs.some(c => currentGroupClubs.includes(c)));
        if (safeIdx !== -1) selectedIdx = safeIdx;
        
        const team = unassigned.splice(selectedIdx, 1)[0];
        groupArrays[gIndex].push(team);
        
        gIndex += dir;
        if (gIndex >= numGroups || gIndex < 0) { dir *= -1; gIndex += dir; }
      }
      groupArrays.forEach((arr, i) => newGroups[cat][`Group ${String.fromCharCode(65 + i)}`] = arr);
    });
    setGroups(newGroups);
    setMatches([]);
  };

  const generateSchedule = () => {
    let newMatches = [];
    const timeSlots = generateTimeSlots(day1Start, 8);
    
    ['U50', 'O50'].forEach(cat => {
      Object.entries(groups[cat]).forEach(([groupName, groupTeams]) => {
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            newMatches.push({ id: generateId(), day: 1, time: null, court: null, category: cat, stage: 'Group', groupName, team1: groupTeams[i], team2: groupTeams[j], score: null, winnerId: null });
          }
        }
      });
    });

    const scheduleState = {};
    timeSlots.forEach(time => scheduleState[time] = { courtsUsed: 0, playingTeams: new Set() });

    newMatches.forEach(match => {
      for (const time of timeSlots) {
        const slot = scheduleState[time];
        if (slot.courtsUsed < COURTS && !slot.playingTeams.has(match.team1.id) && !slot.playingTeams.has(match.team2.id)) {
           match.time = time;
           match.court = slot.courtsUsed + 1;
           slot.courtsUsed++;
           slot.playingTeams.add(match.team1.id);
           slot.playingTeams.add(match.team2.id);
           break;
        }
      }
    });

    setMatches(newMatches);
  };

  // Automated Scoring Logic
  const fillMissingScores = (stageFilter = '', groupFilter = '') => {
    setMatches(prev => prev.map(m => {
      const isStageMatch = stageFilter === '' || m.stage === stageFilter || (stageFilter === 'Placement' && m.stage === 'Placement');
      const isGroupMatch = groupFilter === '' || m.groupName.includes(groupFilter);

      if (m.score || !m.team1 || !m.team2 || m.team1.isBye || m.team2.isBye || !isStageMatch || !isGroupMatch) return m;
      
      const randomData = generateRandomScore();
      return { 
        ...m, 
        score: { s1: randomData.s1, s2: randomData.s2, tb: randomData.tb }, 
        winnerId: randomData.winnerIdx === 1 ? m.team1.id : m.team2.id 
      };
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

  // --- Standings Calculation ---
  const standings = useMemo(() => {
    const stats = {};
    teams.forEach(t => {
      stats[t.id] = { ...t, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 };
    });

    matches.filter(m => m.stage === 'Group' && m.score).forEach(m => {
      const { s1, s2, tb } = m.score;
      const t1 = stats[m.team1.id]; const t2 = stats[m.team2.id];
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

  // --- K.O. Bracket Generation Logic ---
  const generateKO = (forceQualifyCount = null) => {
    let qualCount = forceQualifyCount || koQualifyCount;

    // Check if we need to prompt for Top 3
    if (!forceQualifyCount && simState === 'idle') {
      let needsPrompt = false;
      ['U50', 'O50'].forEach(cat => {
        const groupCount = Object.keys(groups[cat]).length;
        if (groupCount > 0 && groupCount <= 2 && qualCount === 2) needsPrompt = true;
      });
      if (needsPrompt && window.confirm("You have 2 or fewer groups. Advancing only Top 2 will leave the bracket mostly empty. Do you want to advance the Top 3 teams from each group instead?")) {
         qualCount = 3;
         setKoQualifyCount(3);
      }
    }

    const newBrackets = { U50: null, O50: null };
    let newMatches = [...matches.filter(m => m.stage === 'Group')];
    
    const day2Slots = generateTimeSlots(day2Start, 3);
    const timeQF = day2Slots[0];
    const timeSF = day2Slots[1];
    const timeFinal = day2Slots[2];

    const getAvailableCourt = (time) => {
      const courtsInUse = newMatches.filter(m => m.day === 2 && m.time === time).map(m => m.court);
      for (let i = 1; i <= COURTS; i++) if (!courtsInUse.includes(i)) return i;
      return Math.floor(Math.random() * COURTS) + 1; // Fallback
    };

    ['U50', 'O50'].forEach(cat => {
      let qualifiers = [];
      Object.values(standings[cat]).forEach(groupStandings => {
        for(let i=0; i<qualCount; i++) {
           if (groupStandings[i]) qualifiers.push({ ...groupStandings[i], seedType: `${i+1}st` });
        }
      });
      if (qualifiers.length === 0) return;

      qualifiers.sort((a, b) => {
        if (a.seedType !== b.seedType) return a.seedType.localeCompare(b.seedType);
        if (b.won !== a.won) return b.won - a.won;
        return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
      });

      while (qualifiers.length < 8) qualifiers.push({ isBye: true, name: 'BYE' });

      // Build Base Nodes
      const qfNodes = [
        { id: `qf1_${cat}`, team1: qualifiers[0], team2: qualifiers[7], next: `sf1_${cat}`, nextLoser: `place_sf1_${cat}` },
        { id: `qf2_${cat}`, team1: qualifiers[3], team2: qualifiers[4], next: `sf1_${cat}`, nextLoser: `place_sf1_${cat}` },
        { id: `qf3_${cat}`, team1: qualifiers[2], team2: qualifiers[5], next: `sf2_${cat}`, nextLoser: `place_sf2_${cat}` },
        { id: `qf4_${cat}`, team1: qualifiers[1], team2: qualifiers[6], next: `sf2_${cat}`, nextLoser: `place_sf2_${cat}` }
      ];

      const sfNodes = [
        { id: `sf1_${cat}`, title: 'Semi-Final 1', team1: null, team2: null, next: `final_${cat}`, nextLoser: `place_3_${cat}` },
        { id: `sf2_${cat}`, title: 'Semi-Final 2', team1: null, team2: null, next: `final_${cat}`, nextLoser: `place_3_${cat}` }
      ];

      const pSfNodes = [
        { id: `place_sf1_${cat}`, title: 'Pos 5-8 Semi-Final 1', team1: null, team2: null, next: `place_5_${cat}`, nextLoser: `place_7_${cat}` },
        { id: `place_sf2_${cat}`, title: 'Pos 5-8 Semi-Final 2', team1: null, team2: null, next: `place_5_${cat}`, nextLoser: `place_7_${cat}` }
      ];

      const finalNodes = [
        { id: `final_${cat}`, title: 'Grand Final', team1: null, team2: null },
        { id: `place_3_${cat}`, title: '3rd Place Match', team1: null, team2: null },
        { id: `place_5_${cat}`, title: '5th Place Match', team1: null, team2: null },
        { id: `place_7_${cat}`, title: '7th Place Match', team1: null, team2: null }
      ];

      // Schedule QFs
      qfNodes.forEach(node => {
        if (!node.team1.isBye && !node.team2.isBye) {
           newMatches.push({
             id: node.id, category: cat, stage: 'KO', groupName: 'Quarter-Final',
             team1: node.team1, team2: node.team2, score: null, winnerId: null, 
             nextMatchId: node.next, nextLoserId: node.nextLoser,
             day: 2, time: timeQF, court: getAvailableCourt(timeQF)
           });
        }
      });

      // Initialize SFs and Final Placement Matches (empty to be filled)
      [...sfNodes, ...pSfNodes].forEach(node => {
         newMatches.push({
           id: node.id, category: cat, stage: node.id.includes('place') ? 'Placement' : 'KO', 
           groupName: node.title, team1: null, team2: null, score: null, winnerId: null,
           nextMatchId: node.next, nextLoserId: node.nextLoser,
           day: 2, time: timeSF, court: getAvailableCourt(timeSF)
         });
      });

      finalNodes.forEach(node => {
         newMatches.push({
           id: node.id, category: cat, stage: node.id.includes('place') ? 'Placement' : 'KO', 
           groupName: node.title, team1: null, team2: null, score: null, winnerId: null,
           day: 2, time: timeFinal, court: getAvailableCourt(timeFinal)
         });
      });

      newBrackets[cat] = { qf: qfNodes, sf: sfNodes, pSf: pSfNodes, finals: finalNodes };
    });

    setBrackets(newBrackets);
    setMatches(newMatches);
  };

  useEffect(() => {
    if (!brackets.U50 && !brackets.O50) return;

    let updatedMatches = [...matches];
    let changesMade = false;

    const pushToNode = (matchId, team) => {
       if (!matchId || !team) return;
       let targetMatch = updatedMatches.find(m => m.id === matchId);
       if (targetMatch && !targetMatch.team1) { targetMatch.team1 = team; changesMade = true; }
       else if (targetMatch && !targetMatch.team2 && targetMatch.team1.id !== team.id) { targetMatch.team2 = team; changesMade = true; }
    };

    // Auto-advance winners/losers
    matches.filter(m => (m.stage === 'KO' || m.stage === 'Placement') && m.winnerId).forEach(m => {
       const winner = m.winnerId === m.team1.id ? m.team1 : m.team2;
       const loser = m.winnerId === m.team1.id ? m.team2 : m.team1;
       pushToNode(m.nextMatchId, winner);
       pushToNode(m.nextLoserId, loser);
    });

    // Auto-advance Byes
    ['U50', 'O50'].forEach(cat => {
      if(brackets[cat]) {
        brackets[cat].qf.forEach(qf => {
          if (qf.team1.isBye) pushToNode(qf.next, qf.team2);
          if (qf.team2.isBye) pushToNode(qf.next, qf.team1);
        });
      }
    });

    if (changesMade) setMatches(updatedMatches);
  }, [matches, brackets]);

  const finalRankings = useMemo(() => {
    const ranks = { U50: [], O50: [] };
    if (!brackets.U50 && !brackets.O50) return ranks;

    ['U50', 'O50'].forEach(cat => {
      const b = brackets[cat];
      if (!b) return;
      const getWinner = (id) => { const m = matches.find(x => x.id === id); return m?.winnerId ? (m.winnerId === m.team1.id ? m.team1 : m.team2) : null; };
      const getLoser = (id) => { const m = matches.find(x => x.id === id); return m?.winnerId ? (m.winnerId === m.team1.id ? m.team2 : m.team1) : null; };

      const r1 = getWinner(`final_${cat}`);
      const r2 = getLoser(`final_${cat}`);
      const r3 = getWinner(`place_3_${cat}`);
      const r4 = getLoser(`place_3_${cat}`);
      const r5 = getWinner(`place_5_${cat}`);
      const r6 = getLoser(`place_5_${cat}`);
      const r7 = getWinner(`place_7_${cat}`);
      const r8 = getLoser(`place_7_${cat}`);

      const top8 = [r1, r2, r3, r4, r5, r6, r7, r8];
      top8.forEach((team, idx) => {
         if (team && !team.isBye) ranks[cat].push({ rank: idx + 1, team });
      });

      // Append remaining group stage teams
      const placedIds = ranks[cat].map(r => r.team.id);
      let remaining = [];
      Object.values(standings[cat]).forEach(groupSt => {
         groupSt.forEach(t => {
           if (!placedIds.includes(t.id)) remaining.push(t);
         });
      });

      remaining.sort((a, b) => {
         if (b.won !== a.won) return b.won - a.won;
         const aSetDiff = a.setsWon - a.setsLost; const bSetDiff = b.setsWon - b.setsLost;
         if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
         return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
      });

      remaining.forEach((team, idx) => {
         ranks[cat].push({ rank: ranks[cat].length + 1, team });
      });
    });
    return ranks;
  }, [matches, brackets, standings]);

  // --- Global Simulation Engine ---
  const handleSimulateTournament = () => {
    if (simState !== 'idle') return;
    setSimState('init');
  };

  useEffect(() => {
    if (simState === 'idle') return;

    const delay = 1200; 
    const timer = setTimeout(() => {
      switch (simState) {
        case 'init': loadMockData(); setActiveTab('registration'); setSimState('groups'); break;
        case 'groups': generateGroups(); setActiveTab('groups'); setSimState('schedule'); break;
        case 'schedule': generateSchedule(); setActiveTab('schedule'); setSimState('group_scores'); break;
        case 'group_scores': fillMissingScores('Group'); setActiveTab('groups'); setSimState('ko'); break;
        case 'ko': 
          let autoQualCount = 2;
          ['U50', 'O50'].forEach(cat => { if (Object.keys(groups[cat]).length > 0 && Object.keys(groups[cat]).length <= 2) autoQualCount = 3; });
          generateKO(autoQualCount); 
          setActiveTab('bracket'); 
          setSimState('ko_qf_scores'); 
          break;
        case 'ko_qf_scores': fillMissingScores('KO', 'Quarter-Final'); setSimState('ko_sf_scores'); break;
        case 'ko_sf_scores': fillMissingScores('KO', 'Semi-Final'); fillMissingScores('Placement', 'Pos 5-8 Semi-Final'); setSimState('ko_final_scores'); break;
        case 'ko_final_scores': fillMissingScores('KO', 'Final'); fillMissingScores('Placement', 'Place Match'); setSimState('idle'); break;
        default: setSimState('idle');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [simState]);


  const renderScore = (score) => {
    if (!score) return <span className="text-gray-400">vs</span>;
    let text = `${score.s1[0]}:${score.s1[1]} | ${score.s2[0]}:${score.s2[1]}`;
    if (score.tb && (score.tb[0] > 0 || score.tb[1] > 0)) text += ` | [${score.tb[0]}:${score.tb[1]}]`;
    return <span className="font-semibold text-blue-700">{text}</span>;
  };

  // --- UI RENDER: LOGIN & LAUNCH SCREEN ---
  if (appMode === 'login') {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        {/* Organizer / Player Login */}
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-gray-200 mb-6">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full flex space-x-2">
              <Lock className="h-8 w-8 text-blue-800" />
              <Smartphone className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Tournament Login</h2>
          <p className="text-center text-gray-500 text-sm mb-6">Enter Organizer Password or 4-Digit Team PIN</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg text-center tracking-widest font-bold" placeholder="Password or PIN" required />
            {authError && <p className="text-red-500 text-sm text-center font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-blue-700 text-white p-3 rounded-lg font-bold hover:bg-blue-800 shadow-sm">Login</button>
          </form>
          
          {/* File loader for offline local players */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-2">Have a tournament file?</p>
            <label className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded cursor-pointer transition">
               Load Data File
               <input type="file" accept=".json" className="hidden" onChange={(e) => {handleImportTournament(e); setAuthError('Data loaded! Enter PIN.');}} />
            </label>
          </div>
        </div>

        {/* TV Monitor Launch */}
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-700 text-center">
           <Tv className="h-10 w-10 text-indigo-400 mx-auto mb-4" />
           <h3 className="font-bold text-white text-xl mb-2">TV Monitor Mode</h3>
           <p className="text-sm text-slate-400 mb-6">Launch a read-only, dark-mode dashboard that auto-syncs with the Organizer.</p>
           <button onClick={() => setAppMode('monitor')} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-500 shadow-lg flex items-center justify-center">
             <MonitorIcon size={20} className="mr-2" /> Launch Monitor
           </button>
        </div>
      </div>
    );
  }

  // --- UI RENDER: MOBILE PLAYER PORTAL ---
  if (appMode === 'player') {
    const myTeam = teams.find(t => t.id === loggedInTeamId);
    if (!myTeam) { setAppMode('login'); return null; }

    // Find Team's Group
    let myGroupTeams = [];
    let myGroupName = 'TBD';
    if (groups[myTeam.category]) {
      Object.entries(groups[myTeam.category]).forEach(([name, gTeams]) => {
        if (gTeams.find(t => t.id === myTeam.id)) {
           myGroupTeams = standings[myTeam.category][name] || gTeams;
           myGroupName = name;
        }
      });
    }

    // Find Team's Matches
    const myMatches = matches.filter(m => m.team1?.id === myTeam.id || m.team2?.id === myTeam.id);
    const scheduledMatches = myMatches.filter(m => m.time !== null && !m.team1?.isBye && !m.team2?.isBye).sort((a,b) => {
      if(a.day !== b.day) return a.day - b.day;
      return a.time.localeCompare(b.time);
    });

    return (
      <div className="bg-gray-900 min-h-screen flex justify-center">
        {/* Smartphone Container (9:16 aspect ratio limits) */}
        <div className="w-full max-w-[400px] bg-gray-50 min-h-screen flex flex-col shadow-2xl relative">
          
          {/* Mobile Header */}
          <header className="bg-blue-700 text-white pt-8 pb-6 px-5 rounded-b-3xl shadow-md z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-800 p-2 rounded-full"><User size={24} className="text-blue-200" /></div>
              <button onClick={() => {setLoggedInTeamId(null); setPasswordInput(''); setAppMode('login');}} className="text-blue-200 hover:text-white p-1">
                <LogOut size={20} />
              </button>
            </div>
            <h1 className="text-2xl font-bold leading-tight mb-1">{myTeam.name}</h1>
            <div className="flex items-center space-x-2 text-blue-200 text-sm font-medium">
               <span>{CATEGORIES[myTeam.category]}</span>
               <span>•</span>
               <span className="truncate">{myTeam.clubs.join(' / ')}</span>
            </div>
          </header>

          {/* Mobile Content Area */}
          <main className="flex-1 overflow-y-auto p-5 pb-24">
            
            {/* Matches Tab */}
            {playerTab === 'matches' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-lg font-bold text-gray-800 flex items-center"><Calendar className="mr-2 text-blue-600" size={20}/> My Schedule</h2>
                {scheduledMatches.length === 0 ? (
                  <div className="bg-white p-6 rounded-2xl text-center shadow-sm border border-gray-100 text-gray-500">No matches scheduled yet.</div>
                ) : (
                  scheduledMatches.map(m => {
                    const isWinner = m.winnerId === myTeam.id;
                    const isLoser = m.winnerId && m.winnerId !== myTeam.id;
                    const opp = m.team1.id === myTeam.id ? m.team2 : m.team1;
                    
                    return (
                      <div key={m.id} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${isWinner ? 'border-l-green-500' : isLoser ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                        <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          <span>Day {m.day} • {m.time} • Crt {m.court}</span>
                          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{m.groupName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">Opponent</div>
                            <div className="font-bold text-gray-800 text-sm">{opp.name}</div>
                          </div>
                          <div className="text-right pl-4">
                            {m.score ? (
                               <div className={`font-black text-lg ${isWinner ? 'text-green-600' : 'text-red-500'}`}>
                                  {m.score.s1[0]}:{m.score.s1[1]} <br/> {m.score.s2[0]}:{m.score.s2[1]}
                                  {m.score.tb && <span><br/>[{m.score.tb[0]}:{m.score.tb[1]}]</span>}
                               </div>
                            ) : (
                               <span className="text-gray-300 font-bold text-sm">VS</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Group Tab */}
            {playerTab === 'group' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-lg font-bold text-gray-800 flex items-center"><GitCommit className="mr-2 text-blue-600" size={20}/> {myGroupName}</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-500 text-xs">
                       <tr><th className="p-3">Pos</th><th className="p-3">Team</th><th className="p-3 text-center">W-L</th></tr>
                     </thead>
                     <tbody>
                       {myGroupTeams.map((t, idx) => (
                         <tr key={t.id} className={`border-b border-gray-100 last:border-0 ${t.id === myTeam.id ? 'bg-blue-50/50' : ''}`}>
                           <td className="p-3 font-bold text-gray-400">{idx+1}</td>
                           <td className={`p-3 truncate max-w-[120px] ${t.id === myTeam.id ? 'font-bold text-blue-800' : 'text-gray-700'}`}>{t.name}</td>
                           <td className="p-3 text-center font-bold">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              </div>
            )}

            {/* Ranking Tab */}
            {playerTab === 'rankings' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-lg font-bold text-gray-800 flex items-center"><Award className="mr-2 text-amber-500" size={20}/> Leaderboard</h2>
                {(!finalRankings[myTeam.category] || finalRankings[myTeam.category].length === 0) ? (
                   <div className="bg-white p-6 rounded-2xl text-center shadow-sm border border-gray-100 text-gray-500">Rankings will appear after K.O. stage begins.</div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {finalRankings[myTeam.category].map((item, idx) => (
                       <div key={item.team.id} className={`flex items-center p-3 border-b border-gray-100 last:border-0 ${item.team.id === myTeam.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
                         <div className="w-8 text-center font-bold text-gray-400">{idx===0?'🏆':item.rank}</div>
                         <div className={`flex-1 pl-3 truncate ${item.team.id === myTeam.id ? 'font-bold text-blue-800' : 'text-gray-700'}`}>{item.team.name}</div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-3 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
             <button onClick={() => setPlayerTab('matches')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-colors ${playerTab === 'matches' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}>
               <Calendar size={20} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Matches</span>
             </button>
             <button onClick={() => setPlayerTab('group')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-colors ${playerTab === 'group' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}>
               <GitCommit size={20} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Group</span>
             </button>
             <button onClick={() => setPlayerTab('rankings')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-colors ${playerTab === 'rankings' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'}`}>
               <Award size={20} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Rankings</span>
             </button>
          </nav>

        </div>
      </div>
    );
  }

  // --- UI RENDER: TV MONITOR MODE ---
  if (appMode === 'monitor') {
    const renderMonitorScore = (score) => {
      if (!score) return <span className="text-slate-600 font-normal">vs</span>;
      let text = `${score.s1[0]}:${score.s1[1]}   ${score.s2[0]}:${score.s2[1]}`;
      if (score.tb && (score.tb[0] > 0 || score.tb[1] > 0)) text += `   [${score.tb[0]}:${score.tb[1]}]`;
      return <span className="font-bold text-emerald-400">{text}</span>;
    };

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8 flex flex-col">
        {/* TV Header */}
        <header className="flex justify-between items-center mb-10 border-b border-slate-700 pb-6">
          <div className="flex items-center space-x-5">
            <Tv className="h-12 w-12 text-indigo-400" />
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">Live Tournament</h1>
              <div className="text-xl font-semibold text-indigo-400 uppercase tracking-widest mt-1">{activeTab.replace('_', ' ')}</div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button onClick={() => {
                sessionStorage.removeItem('tennis_auth');
                setPasswordInput('');
                setAppMode('login');
              }} className="flex items-center space-x-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition border border-slate-700 text-lg group">
              <Lock size={20} className="group-hover:text-indigo-400 transition-colors" /> <span>Organizer Mode</span>
            </button>
            <div className="text-4xl font-bold text-slate-300 flex items-center bg-slate-800 px-6 py-3 rounded-xl shadow-inner border border-slate-700">
              <Clock className="mr-4 text-indigo-400" size={32} /> {currentTime}
            </div>
          </div>
        </header>

        {/* TV Content Area */}
        <main className="flex-1 overflow-hidden">
          
          {/* Monitor: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {[1, 2].map(day => {
                const dayM = matches.filter(m => m.day === day && m.time !== 'BYE').sort((a,b) => a.time.localeCompare(b.time));
                if (!dayM.length) return null;
                return (
                  <div key={day} className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col h-full">
                    <div className="bg-indigo-600 text-white p-5 text-2xl font-bold uppercase tracking-wider">
                      Day {day} Schedule
                    </div>
                    <div className="p-1">
                      <table className="w-full text-xl">
                        <tbody>
                          {dayM.map((m, i) => (
                            <tr key={m.id} className={`border-b border-slate-700 last:border-0 ${i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                              <td className="p-4 font-bold text-slate-300 w-24">{m.time}</td>
                              <td className="p-4 text-indigo-300 font-semibold w-24">Crt {m.court}</td>
                              <td className={`p-4 text-right truncate max-w-[200px] ${m.winnerId === m.team1?.id ? 'text-white font-bold' : 'text-slate-400'}`}>{m.team1?.name || 'TBD'}</td>
                              <td className="p-4 text-center tracking-widest w-48 bg-slate-900/50">{renderMonitorScore(m.score)}</td>
                              <td className={`p-4 text-left truncate max-w-[200px] ${m.winnerId === m.team2?.id ? 'text-white font-bold' : 'text-slate-400'}`}>{m.team2?.name || 'TBD'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Monitor: GROUPS */}
          {activeTab === 'groups' && (
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
               {['U50', 'O50'].map(cat => {
                 if (Object.keys(groups[cat]).length === 0) return null;
                 return (
                   <div key={cat} className="space-y-6">
                     <h2 className="text-3xl font-bold text-indigo-300 border-b border-slate-700 pb-3">{CATEGORIES[cat]}</h2>
                     <div className="grid grid-cols-2 gap-6">
                       {Object.entries(groups[cat]).map(([groupName, groupTeams]) => (
                         <div key={groupName} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                           <div className="bg-slate-700 p-3 text-xl font-bold text-center text-white tracking-widest">{groupName}</div>
                           <table className="w-full text-lg">
                             <thead className="bg-slate-900/50 text-slate-400"><tr><th className="p-2">Team</th><th className="p-2 text-center">W-L</th><th className="p-2 text-center">Sets</th></tr></thead>
                             <tbody>
                               {(standings[cat][groupName] || groupTeams).map(t => (
                                 <tr key={t.id} className="border-b border-slate-700 last:border-0">
                                   <td className="p-3 font-medium text-slate-200 truncate max-w-[150px]">{t.name}</td>
                                   <td className="p-3 text-center font-bold text-white">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                                   <td className="p-3 text-center text-slate-400">{t.setsWon !== undefined ? `${t.setsWon}:${t.setsLost}` : '0:0'}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       ))}
                     </div>
                   </div>
                 )
               })}
             </div>
          )}

          {/* Monitor: RANKINGS */}
          {activeTab === 'rankings' && (
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {['U50', 'O50'].map(cat => {
                  if (!finalRankings[cat] || finalRankings[cat].length === 0) return null;
                  return (
                    <div key={cat} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                       <div className="bg-indigo-600 text-white p-5 text-3xl font-bold flex justify-between items-center">
                         <span>{CATEGORIES[cat]}</span> <Award size={36} className="text-yellow-400" />
                       </div>
                       <table className="w-full text-2xl table-fixed">
                          <tbody>
                             {finalRankings[cat].slice(0, 8).map((item, idx) => (
                                <tr key={item.team.id} className={`border-b border-slate-700 last:border-0 ${idx === 0 ? 'bg-yellow-500/20 text-yellow-300' : idx === 1 ? 'bg-slate-400/10 text-slate-300' : idx === 2 ? 'bg-amber-700/20 text-amber-400' : 'text-slate-400'}`}>
                                   <td className="p-5 text-center font-bold w-24 text-3xl">{idx === 0 ? '🏆' : item.rank}</td>
                                   <td className="p-5 font-bold truncate">{item.team.name}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  )
                })}
             </div>
          )}

          {/* Monitor: BRACKET */}
          {activeTab === 'bracket' && (
             <div className="overflow-x-auto pb-12 flex flex-col space-y-16">
               {['U50', 'O50'].map(cat => {
                 if (!brackets[cat]) return null;
                 const getMatchData = (id) => matches.find(m => m.id === id);
                 
                 const MatchBox = ({ match, title }) => {
                   if (!match) return <div className="w-64 h-24 border-2 border-dashed border-slate-600 rounded-xl bg-slate-800/50 flex items-center justify-center text-slate-500 text-lg font-medium m-2">TBD</div>;
                   const t1IsBye = match.team1?.isBye;
                   const t2IsBye = match.team2?.isBye;
                   const isDeadMatch = t1IsBye && t2IsBye;

                   if (isDeadMatch) return null;

                   return (
                     <div className="w-72 border border-slate-600 rounded-xl bg-slate-800 shadow-xl overflow-hidden m-2">
                        <div className="bg-slate-700 text-sm text-center py-2 font-bold text-slate-300 border-b border-slate-600 tracking-wider uppercase">{title || match.groupName}</div>
                        <div className={`p-3 border-b border-slate-600 flex justify-between text-lg ${match.winnerId === match.team1?.id ? 'bg-indigo-900/40 text-white font-bold' : 'text-slate-300'}`}>
                          <span className={`truncate pr-2 ${t1IsBye ? 'text-indigo-400 italic font-bold text-sm' : ''}`}>{t1IsBye ? 'Advances (BYE)' : (match.team1?.name || 'TBD')}</span>
                          {!t1IsBye && !t2IsBye && <span className="text-emerald-400 font-bold tracking-widest">{match.score?.s1[0]} {match.score?.s2[0]}</span>}
                        </div>
                        <div className={`p-3 flex justify-between text-lg ${match.winnerId === match.team2?.id ? 'bg-indigo-900/40 text-white font-bold' : 'text-slate-300'}`}>
                          <span className={`truncate pr-2 ${t2IsBye ? 'text-indigo-400 italic font-bold text-sm' : ''}`}>{t2IsBye ? 'Advances (BYE)' : (match.team2?.name || 'TBD')}</span>
                          {!t1IsBye && !t2IsBye && <span className="text-emerald-400 font-bold tracking-widest">{match.score?.s1[1]} {match.score?.s2[1]}</span>}
                        </div>
                     </div>
                   );
                 };

                 return (
                   <div key={cat} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                      <h2 className="text-3xl font-extrabold text-white mb-8 border-b border-slate-700 pb-4 flex items-center">
                        <Trophy className="mr-4 text-yellow-400" size={32}/> {CATEGORIES[cat]} Bracket
                      </h2>
                      
                      <div className="flex items-center space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-6 h-[600px]">
                           {brackets[cat].qf.map((qf, i) => (
                             <div key={i} className="relative"><MatchBox match={getMatchData(qf.id)} title={`Quarter-Final ${i+1}`} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-slate-600"></div></div>
                           ))}
                        </div>
                        <div className="flex flex-col justify-around h-[600px]">
                           {brackets[cat].sf.map((sf, i) => (
                             <div key={i} className="relative"><div className="absolute top-[-100px] -left-6 bottom-[50%] border-l-2 border-slate-600 rounded-tl-lg"></div><div className="absolute bottom-[-100px] -left-6 top-[50%] border-l-2 border-slate-600 rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-slate-600"></div><MatchBox match={getMatchData(sf.id)} title={sf.title} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-slate-600"></div></div>
                           ))}
                        </div>
                        <div className="flex flex-col justify-center h-[600px]">
                           <div className="relative"><div className="absolute top-[-150px] -left-6 bottom-[50%] border-l-2 border-slate-600 rounded-tl-lg"></div><div className="absolute bottom-[-150px] -left-6 top-[50%] border-l-2 border-slate-600 rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-slate-600"></div><MatchBox match={getMatchData(brackets[cat].finals[0].id)} title="CHAMPIONSHIP" /></div>
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-slate-300 mt-12 mb-6 border-b border-slate-700 pb-2">Placement Matches</h3>
                      
                      <div className="flex items-start space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-4">
                           {brackets[cat].pSf.map((pSf, i) => (
                             <div key={i} className="relative"><MatchBox match={getMatchData(pSf.id)} title={pSf.title} /></div>
                           ))}
                        </div>
                        <div className="flex flex-col justify-around space-y-4">
                           <MatchBox match={getMatchData(brackets[cat].finals[2].id)} title="5th Place Match" />
                           <MatchBox match={getMatchData(brackets[cat].finals[3].id)} title="7th Place Match" />
                        </div>
                      </div>
                      
                      <div className="mt-4"><MatchBox match={getMatchData(brackets[cat].finals[1].id)} title="3rd Place Match" /></div>

                   </div>
                 )
               })}
             </div>
          )}

        </main>
      </div>
    );
  }

  // --- UI RENDER: ORGANIZER MODE ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
      {/* Top Header */}
      <header className="bg-blue-900 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold hidden md:block">Tennis Tournament Organizer</h1>
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            {/* IO Buttons */}
            <label className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-lg cursor-pointer transition text-sm sm:text-base">
               <Upload size={18} /> <span className="hidden sm:inline">Load File</span>
               <input type="file" accept=".json" className="hidden" onChange={handleImportTournament} />
            </label>
            <button onClick={handleExportTournament} className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base">
               <Download size={18} /> <span className="hidden sm:inline">Save File</span>
            </button>
            <div className="w-px bg-blue-700 mx-1 sm:mx-2"></div>
            
            <button onClick={handleSimulateTournament} disabled={simState !== 'idle'}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-bold transition shadow-sm text-sm sm:text-base ${simState !== 'idle' ? 'bg-purple-800 text-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white animate-pulse'}`}
            >
              {simState !== 'idle' ? <><Loader2 size={18} className="animate-spin" /> <span className="hidden sm:inline">Simulating...</span></> : <><FastForward size={18} /> <span className="hidden sm:inline">Simulate</span></>}
            </button>
            <button onClick={() => window.print()} className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-600 px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base">
              <Printer size={18} /> <span className="hidden sm:inline">Print</span>
            </button>
            <button onClick={() => setAppMode('monitor')} className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base print:hidden shadow-sm border border-slate-700">
              <Tv size={18} /> <span className="hidden sm:inline">Monitor</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-8 print:hidden overflow-x-auto">
          {[
            { id: 'registration', icon: Users, label: 'Registration' },
            { id: 'groups', icon: GitCommit, label: 'Groups' },
            { id: 'schedule', icon: Calendar, label: 'Schedule' },
            { id: 'bracket', icon: Trophy, label: 'K.O. Bracket' },
            { id: 'rankings', icon: Award, label: 'Rankings' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
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
                  <p className="text-blue-700 text-sm mt-1">Register teams manually or load mock data. Edit start times below.</p>
                </div>
                <button onClick={loadMockData} className="flex items-center space-x-2 bg-white text-blue-700 border border-blue-200 px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-50 font-medium">
                  <Play size={18} /> <span>Load Mock Teams</span>
                </button>
              </div>

              {/* Time Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-3">
                   <Clock className="text-blue-600" />
                   <div className="font-medium text-gray-700">Day 1 Start Time:</div>
                   <input type="time" value={day1Start} onChange={(e) => setDay1Start(e.target.value)} className="p-2 border rounded-md font-bold" />
                </div>
                <div className="flex items-center space-x-3">
                   <Clock className="text-green-600" />
                   <div className="font-medium text-gray-700">Day 2 (K.O.) Start Time:</div>
                   <input type="time" value={day2Start} onChange={(e) => setDay2Start(e.target.value)} className="p-2 border rounded-md font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form */}
                <div className="col-span-1 bg-gray-50 p-6 rounded-xl border border-gray-200 h-fit">
                  <h3 className="font-bold text-lg mb-4 flex items-center">
                    {editingTeam ? <Edit2 size={18} className="mr-2 text-amber-500"/> : <PlusCircle size={18} className="mr-2 text-blue-600"/>} 
                    {editingTeam ? 'Edit Team' : 'New Team'}
                  </h3>
                  <form onSubmit={handleRegister} className="space-y-4">
                    
                    <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-3">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Player 1</div>
                      <div><input value={regForm.p1Name} onChange={e=>setRegForm({...regForm, p1Name: e.target.value})} className="w-full p-2 border rounded-md text-sm" placeholder="Full Name" required /></div>
                      <div><input value={regForm.p1Club} onChange={e=>setRegForm({...regForm, p1Club: e.target.value})} className="w-full p-2 border rounded-md text-sm" placeholder="Club (Optional)" /></div>
                    </div>

                    <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-3">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Player 2</div>
                      <div><input value={regForm.p2Name} onChange={e=>setRegForm({...regForm, p2Name: e.target.value})} className="w-full p-2 border rounded-md text-sm" placeholder="Full Name" required /></div>
                      <div><input value={regForm.p2Club} onChange={e=>setRegForm({...regForm, p2Club: e.target.value})} className="w-full p-2 border rounded-md text-sm" placeholder="Club (Optional)" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium mb-1">Level</label>
                        <select value={regForm.level} onChange={e=>setRegForm({...regForm, level: e.target.value})} className="w-full p-2 border rounded-md">
                          <option value="3">3 - Adv</option><option value="2">2 - Int</option><option value="1">1 - Beg</option>
                        </select></div>
                      <div><label className="block text-sm font-medium mb-1">Category</label>
                        <select value={regForm.category} onChange={e=>setRegForm({...regForm, category: e.target.value})} className="w-full p-2 border rounded-md">
                          <option value="U50">U50</option><option value="O50">O50</option>
                        </select></div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <button type="submit" className={`flex-1 text-white py-2 rounded-md font-medium ${editingTeam ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {editingTeam ? 'Update Team' : 'Register'}
                      </button>
                      {editingTeam && (
                        <button type="button" onClick={() => {setEditingTeam(null); setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });}} className="px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
                
                {/* List */}
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg">Registered Teams ({teams.length})</h3>
                  </div>
                  <div className="overflow-auto max-h-[600px] border border-gray-200 rounded-xl shadow-inner">
                    <table className="w-full text-left text-sm table-fixed">
                      <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="p-3 border-b w-1/3">Team</th>
                          <th className="p-3 border-b w-1/4">Clubs</th>
                          <th className="p-3 border-b w-20">Cat</th>
                          <th className="p-3 border-b w-16">Lvl</th>
                          <th className="p-3 border-b w-16 text-center text-blue-600">PIN</th>
                          <th className="p-3 border-b w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.length === 0 ? <tr><td colSpan="6" className="p-6 text-center text-gray-500">No teams registered yet.</td></tr> : 
                         teams.map((t) => (
                          <tr key={t.id} className={`border-b last:border-0 hover:bg-blue-50 transition ${editingTeam?.id === t.id ? 'bg-amber-50' : ''}`}>
                            <td className="p-3 font-medium text-gray-800 truncate">{t.name}</td>
                            <td className="p-3 text-xs text-gray-500 truncate">{t.clubs.join(' / ') || 'No Club'}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${t.category==='U50'?'bg-green-100 text-green-700':'bg-purple-100 text-purple-700'}`}>{t.category}</span></td>
                            <td className="p-3"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Lvl {t.level}</span></td>
                            <td className="p-3 text-center font-mono font-bold text-blue-700">{t.pin}</td>
                            <td className="p-3 text-right space-x-2">
                               <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-amber-500 transition"><Edit2 size={16}/></button>
                               <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
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

          {/* TAB 2: GROUPS & STANDINGS */}
          {activeTab === 'groups' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center print:hidden">
                <p className="text-gray-600">Groups balanced by skill level and club affiliation.</p>
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
                            <div className="bg-gray-100 p-3 font-bold border-b border-gray-200">{groupName}</div>
                            <table className="w-full text-sm text-left table-fixed">
                              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                <tr>
                                  <th className="px-4 py-2 w-12">Pos</th>
                                  <th className="px-4 py-2">Team</th>
                                  <th className="px-4 py-2 text-center w-16">W-L</th>
                                  <th className="px-4 py-2 text-center w-20">Sets</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(standings[cat][groupName] || groupTeams).map((t, index) => (
                                  <tr key={t.id} className="border-b last:border-0">
                                    <td className="px-4 py-3 font-bold text-gray-400">{index + 1}</td>
                                    <td className="px-4 py-3 truncate">
                                      <div className="font-medium text-gray-900 truncate">{t.name}</div>
                                      <div className="text-xs text-gray-500 truncate">{t.clubs.join(' / ')}</div>
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
                 <div className="flex space-x-3">
                   <button onClick={() => fillMissingScores('Group')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition">
                     Auto-Fill Group Scores
                   </button>
                   <button onClick={() => generateKO(null)} disabled={matches.length === 0} className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium shadow-sm hover:bg-green-700 transition flex items-center">
                      <Trophy size={18} className="mr-2"/> Gen K.O. Bracket (Day 2)
                   </button>
                 </div>
               </div>

               <div className="space-y-8">
                 {[1, 2].map(day => {
                    const dayMatches = matches.filter(m => m.day === day && m.time !== null).sort((a,b) => a.time.localeCompare(b.time));
                    const unscheduled = matches.filter(m => m.day === day && m.time === null);
                    if (dayMatches.length === 0 && unscheduled.length === 0) return null;
                    
                    return (
                      <div key={day} className="mb-8">
                        <h3 className="text-lg font-bold bg-blue-900 text-white p-3 rounded-t-xl flex justify-between items-center">
                          <span>Day {day} {day===1 ? '(Group Stage)' : '(Finals & Placements)'}</span>
                          <span className="text-sm font-normal text-blue-200">Start: {day===1 ? day1Start : day2Start}</span>
                        </h3>
                        <div className="border border-blue-900 rounded-b-xl overflow-hidden bg-white">
                          <table className="w-full text-sm table-fixed">
                            <thead className="bg-gray-100 text-gray-600">
                              <tr>
                                <th className="p-3 text-left w-20">Time</th>
                                <th className="p-3 text-left w-20">Court</th>
                                <th className="p-3 text-left w-24">Stage</th>
                                <th className="p-3 text-right">Team 1</th>
                                <th className="p-3 text-center w-40">Score</th>
                                <th className="p-3 text-left">Team 2</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...dayMatches, ...unscheduled].map((m) => {
                                const isT1Winner = m.winnerId === m.team1?.id;
                                const isT2Winner = m.winnerId === m.team2?.id;
                                const isMissingTeams = !m.team1 || !m.team2;
                                const isBye = m.team1?.isBye || m.team2?.isBye;
                                const isUnscheduled = m.time === null;
                                
                                return (
                                <tr key={m.id} className={`border-b last:border-0 hover:bg-blue-50 transition ${isMissingTeams || isBye || isUnscheduled ? '' : 'cursor-pointer'}`} 
                                    onClick={() => !isMissingTeams && !isBye && !isUnscheduled && setScoreModal(m)}>
                                  <td className={`p-3 font-bold ${isUnscheduled ? 'text-red-500' : 'text-gray-700'}`}>{m.time || 'Unscheduled'}</td>
                                  <td className="p-3">{m.court ? <span className="bg-gray-200 px-2 py-1 rounded-full text-xs font-bold">Crt {m.court}</span> : '-'}</td>
                                  <td className="p-3 text-xs truncate"><span className="block font-bold text-blue-700">{CATEGORIES[m.category]?.substring(0,3)} {m.category}</span><span className="text-gray-500">{m.groupName}</span></td>
                                  <td className={`p-3 text-right truncate ${isT1Winner ? 'font-bold text-green-700' : ''}`}>
                                    {m.team1?.isBye ? <span className="text-blue-500 font-bold italic">Advances (BYE)</span> : (m.team1?.name || 'TBD')}
                                  </td>
                                  <td className="p-3 text-center bg-gray-50 border-x">
                                     {isBye ? <span className="text-gray-400 italic text-xs">NO MATCH</span> : renderScore(m.score)}
                                  </td>
                                  <td className={`p-3 text-left truncate ${isT2Winner ? 'font-bold text-green-700' : ''}`}>
                                    {m.team2?.isBye ? <span className="text-blue-500 font-bold italic">Advances (BYE)</span> : (m.team2?.name || 'TBD')}
                                  </td>
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
                   const t1IsBye = match.team1?.isBye;
                   const t2IsBye = match.team2?.isBye;
                   const isDeadMatch = t1IsBye && t2IsBye;

                   if (isDeadMatch) return null; // Hide empty placement matches

                   return (
                     <div className="w-64 border border-gray-300 rounded-xl bg-white shadow-sm overflow-hidden m-2 print:border-gray-400 print:shadow-none break-inside-avoid">
                        <div className="bg-gray-100 text-xs text-center py-1 font-bold text-gray-600 border-b">{title || match.groupName}</div>
                        <div className={`p-2 border-b flex justify-between ${match.winnerId === match.team1?.id ? 'bg-green-50 font-bold' : ''}`}>
                          <span className={`truncate pr-2 ${t1IsBye ? 'text-blue-500 italic font-bold text-xs' : ''}`}>{t1IsBye ? 'Advances (BYE)' : (match.team1?.name || 'TBD')}</span>
                          {!t1IsBye && !t2IsBye && <span>{match.score?.s1[0]} {match.score?.s2[0]}</span>}
                        </div>
                        <div className={`p-2 flex justify-between ${match.winnerId === match.team2?.id ? 'bg-green-50 font-bold' : ''}`}>
                          <span className={`truncate pr-2 ${t2IsBye ? 'text-blue-500 italic font-bold text-xs' : ''}`}>{t2IsBye ? 'Advances (BYE)' : (match.team2?.name || 'TBD')}</span>
                          {!t1IsBye && !t2IsBye && <span>{match.score?.s1[1]} {match.score?.s2[1]}</span>}
                        </div>
                     </div>
                   );
                 };

                 return (
                   <div key={cat} className="mb-16 page-break-after">
                      <h2 className="text-2xl font-bold text-blue-900 mb-8 border-b-2 border-blue-900 pb-2 inline-block">Main Bracket: {CATEGORIES[cat]}</h2>
                      
                      <div className="flex items-center space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-4 h-[600px]">
                           {brackets[cat].qf.map((qf, i) => (
                             <div key={i} className="relative"><MatchBox match={getMatchData(qf.id)} title={`Quarter-Final ${i+1}`} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div></div>
                           ))}
                        </div>
                        <div className="flex flex-col justify-around h-[600px]">
                           {brackets[cat].sf.map((sf, i) => (
                             <div key={i} className="relative"><div className="absolute top-[-100px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-lg"></div><div className="absolute bottom-[-100px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div><MatchBox match={getMatchData(sf.id)} title={sf.title} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div></div>
                           ))}
                        </div>
                        <div className="flex flex-col justify-center h-[600px]">
                           <div className="relative"><div className="absolute top-[-150px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-lg"></div><div className="absolute bottom-[-150px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div><MatchBox match={getMatchData(brackets[cat].finals[0].id)} title="CHAMPIONSHIP" /></div>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-700 mt-12 mb-4 border-b pb-2">Placement Matches (Positions 3-8)</h3>
                      
                      <div className="flex items-start space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-4">
                           {brackets[cat].pSf.map((pSf, i) => (
                             <div key={i} className="relative"><MatchBox match={getMatchData(pSf.id)} title={pSf.title} /></div>
                           ))}
                        </div>
                        <div className="flex flex-col justify-around space-y-4">
                           <MatchBox match={getMatchData(brackets[cat].finals[2].id)} title="5th Place Match" />
                           <MatchBox match={getMatchData(brackets[cat].finals[3].id)} title="7th Place Match" />
                        </div>
                      </div>
                      
                      <div className="mt-4"><MatchBox match={getMatchData(brackets[cat].finals[1].id)} title="3rd Place Match" /></div>

                   </div>
                 )
               })}
             </div>
          )}

          {/* TAB 5: RANKINGS */}
          {activeTab === 'rankings' && (
             <div className="space-y-12">
               {['U50', 'O50'].map(cat => {
                 if (!finalRankings[cat] || finalRankings[cat].length === 0) return null;
                 return (
                   <div key={cat} className="page-break-after">
                      <h2 className="text-2xl font-bold text-blue-900 mb-6 border-b-2 border-blue-900 pb-2 flex items-center">
                        <Award className="mr-3 text-amber-500" /> Final Rankings: {CATEGORIES[cat]}
                      </h2>
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm table-fixed">
                           <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                             <tr>
                               <th className="p-4 w-20 text-center border-r border-gray-200">Rank</th>
                               <th className="p-4 w-1/3">Team</th>
                               <th className="p-4">Clubs</th>
                               <th className="p-4 w-32 text-center">Status</th>
                             </tr>
                           </thead>
                           <tbody>
                             {finalRankings[cat].map((item, idx) => (
                               <tr key={item.team.id} className={`border-b last:border-0 hover:bg-gray-50 
                                 ${idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-gray-50' : idx === 2 ? 'bg-orange-50' : ''}`}>
                                 <td className="p-4 text-center font-bold text-lg border-r border-gray-200">
                                   {idx === 0 ? '🏆 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : item.rank}
                                 </td>
                                 <td className="p-4 font-bold text-gray-800 truncate">{item.team.name}</td>
                                 <td className="p-4 text-gray-600 truncate">{item.team.clubs.join(' / ')}</td>
                                 <td className="p-4 text-center">
                                   {idx < 8 
                                     ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">K.O. Stage</span> 
                                     : <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">Group Stage</span>}
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
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
               e.preventDefault(); const fd = new FormData(e.target);
               handleSaveScore(scoreModal.id, [parseInt(fd.get('s1_t1')||0), parseInt(fd.get('s1_t2')||0)], [parseInt(fd.get('s2_t1')||0), parseInt(fd.get('s2_t2')||0)], [parseInt(fd.get('tb_t1')||0), parseInt(fd.get('tb_t2')||0)]);
            }} className="p-6">
              <div className="flex justify-between items-end mb-4 font-bold text-sm text-gray-500 border-b pb-2">
                <div className="w-1/2">Teams </div><div className="w-12 text-center">Set 1</div><div className="w-12 text-center">Set 2</div><div className="w-12 text-center text-orange-500">TieBrk</div>
              </div>
              <div className="flex justify-between items-center mb-4">
                <div className="w-1/2 font-semibold text-blue-900 truncate pr-2">{scoreModal.team1?.name}</div>
                <input name="s1_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[0]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required />
                <input name="s2_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[0]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50" required />
                <input name="tb_t1" type="number" min="0" max="20" defaultValue={scoreModal.score?.tb[0]} className="w-12 p-2 border rounded text-center font-bold bg-orange-50 text-orange-700" />
              </div>
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

      {/* Print Styles */}
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