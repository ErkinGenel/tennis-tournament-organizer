import { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Users, Calendar, Trash2, Edit2, Play, CheckCircle, X, Lock, 
  Loader2, FastForward, Award, Tv, LogOut, AlertTriangle, Shield, PlusCircle, Printer, Monitor
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

// ==========================================
// 🎨 BRANDING & LOGO
// ==========================================
const BRAND = {
  logo: "https://tcwannweil.com/wp-content/uploads/Logo-50-Jahre.png", 
  banner: "https://tcwannweil.com/wp-content/uploads/image1000099.jpg?auto=format&fit=crop&w=2000&q=80", 
  name: "TC Wannweil"
};

const fallbackConfig = {
  apiKey: "AIzaSyAfyaZQZ0Cic3FdV_IuhgDfz1p6vJVm9jw",
  authDomain: "tennis-organizer-d9ee2.firebaseapp.com",
  projectId: "tennis-organizer-d9ee2",
  storageBucket: "tennis-organizer-d9ee2.firebasestorage.app",
  messagingSenderId: "154827866148",
  appId: "1:154827866148:web:606ca072fd424e6c5618b1"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : fallbackConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'tennis-organizer-live';

const COURTS = 6;
const CATEGORIES = { U50: 'Herren unter 50', O50: 'Herren über 50' };
const LEVELS = [3, 2, 1]; 
const MOCK_CLUBS = ['TC Wannweil', 'TC Reutlingen', 'TC Tübingen', 'TC Metzingen', 'TC Pfullingen'];
const MOCK_FIRST_NAMES = ['Lukas', 'Maximilian', 'Jonas', 'Paul', 'Leon', 'Finn', 'Elias', 'Ben'];
const MOCK_LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner'];

const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

const addDays = (dateStr, days) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const generateTimeSlots = (startTimeStr, numSlots = 8) => {
  const slots = [];
  let [hours, minutes] = startTimeStr.split(':').map(Number);
  for (let i = 0; i < numSlots; i++) {
    slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    minutes += 90;
    if (minutes >= 60) { hours += Math.floor(minutes / 60); minutes = minutes % 60; }
  }
  return slots;
};

export default function App() {
  const [appMode, setAppMode] = useState('login');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [loggedInTeamId, setLoggedInTeamId] = useState(null);
  const [playerTab, setPlayerTab] = useState('matches');
  
  const [activeTab, setActiveTab] = useState('registration');
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState({ U50: {}, O50: {} });
  const [matches, setMatches] = useState([]);
  const [brackets, setBrackets] = useState({ U50: null, O50: null });
  
  const [tournamentStartDate, setTournamentStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [day1Start, setDay1Start] = useState('09:30');
  const [day2Start, setDay2Start] = useState('14:30');
  const [tournamentDays, setTournamentDays] = useState(2);
  const [isolateGrandFinals, setIsolateGrandFinals] = useState(true);

  const [regForm, setRegForm] = useState({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });
  const [editingTeam, setEditingTeam] = useState(null);
  const [scoreModal, setScoreModal] = useState(null);
  const [koPrompt, setKoPrompt] = useState(false);
  const [schedulePrompt, setSchedulePrompt] = useState(false);
  const [printView, setPrintView] = useState('normal');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const [simState, setSimState] = useState('idle');
  const [koQualifyCount, setKoQualifyCount] = useState(2);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('de-DE'));

  const [monitorSlides, setMonitorSlides] = useState([]);
  const [monitorSlideIdx, setMonitorSlideIdx] = useState(0);

  const formatMatchName = (name) => {
      if (!name) return 'Offen';
      if (name.includes('Plätze 5-8 Halbfinale')) return 'Platzierungsspiel, 5-8';
      return name;
  };

  const standings = useMemo(() => {
    const stats = {};
    teams.forEach(t => { stats[t.id] = { ...t, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 }; });

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
      if (!groups[cat]) return; 
      Object.keys(groups[cat]).sort().forEach(gName => {
        calculatedStandings[cat][gName] = groups[cat][gName].map(t => stats[t.id]).sort((a, b) => {
          if (b.won !== a.won) return b.won - a.won;
          const aSetDiff = a.setsWon - a.setsLost; const bSetDiff = b.setsWon - b.setsLost;
          if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
          return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
        });
      });
    });
    return calculatedStandings;
  }, [teams, groups, matches]);

  const finalRankings = useMemo(() => {
    const ranks = { U50: [], O50: [] };
    if (!brackets.U50 && !brackets.O50) return ranks;

    ['U50', 'O50'].forEach(cat => {
      const b = brackets[cat];
      if (!b) return;
      const finalMatch = matches.find(m => m.id === b.finals[0].id);
      if (!finalMatch || !finalMatch.winnerId) return;

      const getWinner = (id) => { const m = matches.find(x => x.id === id); return m?.winnerId ? (m.winnerId === m.team1.id ? m.team1 : m.team2) : null; };
      const getLoser = (id) => { const m = matches.find(x => x.id === id); return m?.winnerId ? (m.winnerId === m.team1.id ? m.team2 : m.team1) : null; };

      const top8 = [
        getWinner(b.finals[0].id), getLoser(b.finals[0].id),
        getWinner(b.finals[1].id), getLoser(b.finals[1].id),
        getWinner(b.finals[2].id), getLoser(b.finals[2].id),
        getWinner(b.finals[3].id), getLoser(b.finals[3].id)
      ];

      top8.forEach((team, idx) => { if (team && !team.isBye) ranks[cat].push({ rank: idx + 1, team }); });

      const placedIds = ranks[cat].map(r => r.team.id);
      let remaining = [];
      if (standings[cat]) {
        Object.values(standings[cat]).forEach(groupSt => {
           groupSt.forEach(t => { if (!placedIds.includes(t.id)) remaining.push(t); });
        });
      }

      remaining.sort((a, b) => {
         if (b.won !== a.won) return b.won - a.won;
         const aSetDiff = a.setsWon - a.setsLost; const bSetDiff = b.setsWon - b.setsLost;
         if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
         return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
      });

      remaining.forEach((team) => ranks[cat].push({ rank: ranks[cat].length + 1, team }));
    });
    return ranks;
  }, [matches, brackets, standings]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (error) { console.error("Firebase Auth Error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const tournamentDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournament', 'mainState');
    const unsubscribe = onSnapshot(tournamentDocRef, (docSnap) => {
      if (docSnap.exists() && appMode !== 'organizer') {
        const d = docSnap.data();
        if (d.teams) setTeams(d.teams);
        if (d.groups) setGroups(d.groups);
        if (d.matches) setMatches(d.matches);
        if (d.brackets) setBrackets(d.brackets);
        if (d.tournamentStartDate) setTournamentStartDate(d.tournamentStartDate);
        if (d.day1Start) setDay1Start(d.day1Start);
        if (d.day2Start) setDay2Start(d.day2Start);
        if (d.tournamentDays) setTournamentDays(d.tournamentDays);
        if (d.isolateGrandFinals !== undefined) setIsolateGrandFinals(d.isolateGrandFinals);
      }
    });
    return () => unsubscribe();
  }, [user, appId, appMode]);

  useEffect(() => {
    const syncToCloud = async () => {
      if (appMode === 'organizer' && user) {
        try {
          const tournamentDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournament', 'mainState');
          await setDoc(tournamentDocRef, { teams, groups, matches, brackets, tournamentStartDate, day1Start, day2Start, tournamentDays, isolateGrandFinals, lastUpdated: new Date().toISOString() });
        } catch (error) { console.error("Failed to push updates:", error); }
      }
    };
    const timeoutId = setTimeout(syncToCloud, 800);
    return () => clearTimeout(timeoutId);
  }, [teams, groups, matches, brackets, tournamentStartDate, day1Start, day2Start, tournamentDays, isolateGrandFinals, appMode, user, appId]);

  useEffect(() => {
    if (appMode === 'monitor') {
      const clockInt = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('de-DE')), 1000);
      return () => clearInterval(clockInt);
    }
  }, [appMode]);

  useEffect(() => {
    if (appMode !== 'monitor') return;
    let newSlides = [];
    const finals = matches.filter(m => m.id && m.id.startsWith('final_'));
    const isEnded = finals.length > 0 && finals.every(m => m.winnerId !== null);
    const hasBrackets = brackets && (brackets.U50 || brackets.O50);

    if (!isEnded) {
        ['U50', 'O50'].forEach(cat => {
            const grps = Object.keys(groups[cat] || {}).sort().map(k => [k, groups[cat][k]]);
            if (grps.length > 0) {
               for(let i=0; i<grps.length; i+=4) {
                   newSlides.push({ type: 'groups', cat, title: `Gruppen ${CATEGORIES[cat]}`, data: grps.slice(i, i+4), pageInfo: grps.length>4 ? `(Teil ${Math.floor(i/4)+1}/${Math.ceil(grps.length/4)})` : '' });
               }
            }
        });

        const scheduleMatches = matches.filter(m => m.time !== 'BYE').sort((a,b) => {
            if (a.day !== b.day) return a.day - b.day;
            if (a.time === 'Flexibel' && b.time === 'Flexibel') {
                if (a.court !== b.court) return (a.court || 0) - (b.court || 0);
                if (a.groupName !== b.groupName) return (a.groupName || '').localeCompare(b.groupName || '');
                return (a.matchOrder || 0) - (b.matchOrder || 0);
            }
            if (a.time === 'Flexibel') return -1;
            if (b.time === 'Flexibel') return 1;
            return (a.time || '').localeCompare(b.time || '');
        });
        
        const pendingMatches = scheduleMatches.filter(m => !m.winnerId);
        const recentlyCompleted = scheduleMatches.filter(m => m.winnerId).slice(-4);
        const displayMatches = [...recentlyCompleted, ...pendingMatches].sort((a,b) => {
            if (a.day !== b.day) return a.day - b.day;
            return (a.time || '').localeCompare(b.time || '');
        });

        const matchChunkSize = 10;
        if (displayMatches.length === 0 && scheduleMatches.length > 0) {
            newSlides.push({ type: 'schedule', title: 'Letzte Ergebnisse', data: scheduleMatches.slice(-10), pageInfo: '' });
        } else if (displayMatches.length > 0) {
            for(let i=0; i<displayMatches.length; i+=matchChunkSize) {
                newSlides.push({ type: 'schedule', title: 'Spielplan', data: displayMatches.slice(i, i+matchChunkSize), pageInfo: displayMatches.length>matchChunkSize ? `(Teil ${Math.floor(i/matchChunkSize)+1}/${Math.ceil(displayMatches.length/matchChunkSize)})` : '' });
            }
        }
    }

    if (hasBrackets) {
        ['U50', 'O50'].forEach(cat => {
            if (brackets[cat]) {
                newSlides.push({ type: 'bracket_main', cat, title: `K.O.-Baum: ${CATEGORIES[cat]}` });
                newSlides.push({ type: 'bracket_placement', cat, title: `Platzierungsspiele: ${CATEGORIES[cat]}` });
            }
        });
    }

    ['U50', 'O50'].forEach(cat => {
        const ranks = finalRankings[cat] || [];
        if (ranks.length > 0) {
            for(let i=0; i<ranks.length; i+=12) {
                newSlides.push({ type: 'rankings', cat, title: `Abschlussplatzierungen: ${CATEGORIES[cat]}`, data: ranks.slice(i, i+12), pageInfo: ranks.length>12 ? `(Plätze ${i+1}-${Math.min(i+12, ranks.length)})` : '' });
            }
        }
    });

    if (newSlides.length === 0) newSlides.push({ type: 'idle', title: 'Willkommen beim Turnier' });

    setMonitorSlides(newSlides);
    if (monitorSlideIdx >= newSlides.length) setMonitorSlideIdx(0);
  }, [appMode, matches, groups, brackets, finalRankings]);

  useEffect(() => {
    if (appMode === 'monitor' && monitorSlides.length > 0) {
      const rotateInt = setInterval(() => { setMonitorSlideIdx(prev => (prev + 1) % monitorSlides.length); }, 15000); 
      return () => clearInterval(rotateInt);
    }
  }, [appMode, monitorSlides]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'wannweil') {
      sessionStorage.setItem('tennis_auth', 'true');
      setAppMode('organizer'); setAuthError('');
    } else {
      const foundTeam = teams.find(t => t.pin === passwordInput);
      if (foundTeam) { setAppMode('player'); setLoggedInTeamId(foundTeam.id); setAuthError(''); } 
      else setAuthError('Falsches Passwort oder Team-PIN.');
    }
  };

  const handleLogout = () => { sessionStorage.removeItem('tennis_auth'); setPasswordInput(''); setAppMode('login'); };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regForm.p1Name || !regForm.p2Name) return;
    const newTeam = { 
       id: editingTeam ? editingTeam.id : generateId(), 
       name: `${regForm.p1Name} / ${regForm.p2Name}`, 
       p1Club: regForm.p1Club, p2Club: regForm.p2Club, 
       clubs: [regForm.p1Club, regForm.p2Club].filter(c => c),
       level: parseInt(regForm.level), category: regForm.category,
       pin: editingTeam ? editingTeam.pin : generatePin()
    };
    if (editingTeam) { setTeams(teams.map(t => t.id === editingTeam.id ? newTeam : t)); setEditingTeam(null); } 
    else setTeams([...teams, newTeam]);
    
    setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });
    setGroups({ U50: {}, O50: {} }); setMatches([]); setBrackets({ U50: null, O50: null });
  };

  const handleEdit = (team) => {
    const names = team.name.split(' / ');
    setRegForm({ p1Name: names[0] || '', p2Name: names[1] || '', p1Club: team.p1Club || team.clubs[0] || '', p2Club: team.p2Club || team.clubs[1] || team.clubs[0] || '', level: team.level.toString(), category: team.category });
    setEditingTeam(team); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setTeams(teams.filter(t => t.id !== id));
    setGroups({ U50: {}, O50: {} }); setMatches([]); setBrackets({ U50: null, O50: null }); setConfirmDelete(null);
  };

  const loadMockData = () => {
    const mockTeams = [];
    ['U50', 'O50'].forEach(category => {
      for (let i = 0; i < 12; i++) {
        const c1 = getRandom(MOCK_CLUBS);
        mockTeams.push({ 
           id: generateId(), name: `${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)} / ${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)}`, 
           p1Club: c1, p2Club: c1, clubs: [c1, c1], level: getRandom(LEVELS), category, pin: generatePin()
        });
      }
    });
    setTeams(mockTeams); setGroups({ U50: {}, O50: {} }); setMatches([]); setBrackets({ U50: null, O50: null });
  };

  const generateGroups = () => {
    const newGroups = { U50: {}, O50: {} };
    ['U50', 'O50'].forEach(cat => {
      const catTeams = teams.filter(t => t.category === cat).sort((a, b) => b.level - a.level);
      if (catTeams.length === 0) return;
      const numGroups = Math.ceil(catTeams.length / 4) || 1;
      const groupArrays = Array.from({ length: numGroups }, () => []);
      let dir = 1; let gIndex = 0;
      const unassigned = [...catTeams];
      
      while (unassigned.length > 0) {
        let selectedIdx = 0;
        const currentGroupClubs = groupArrays[gIndex].flatMap(t => t.clubs);
        const safeIdx = unassigned.findIndex(t => !t.clubs.some(c => currentGroupClubs.includes(c)));
        if (safeIdx !== -1) selectedIdx = safeIdx;
        groupArrays[gIndex].push(unassigned.splice(selectedIdx, 1)[0]);
        gIndex += dir;
        if (gIndex >= numGroups || gIndex < 0) { dir *= -1; gIndex += dir; }
      }
      groupArrays.forEach((arr, i) => newGroups[cat][`Gruppe ${String.fromCharCode(65 + i)}`] = arr);
    });
    setGroups(newGroups); setMatches([]);
  };

  const generateSchedule = (mode = 'traditional') => {
    let newMatches = [];
    if (mode === 'traditional') {
      const timeSlots = generateTimeSlots(day1Start, 8);
      ['U50', 'O50'].forEach(cat => {
        if (!groups[cat]) return;
        Object.keys(groups[cat]).sort().forEach(groupName => {
          const groupTeams = groups[cat][groupName];
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
             match.time = time; match.court = slot.courtsUsed + 1;
             slot.courtsUsed++; slot.playingTeams.add(match.team1.id); slot.playingTeams.add(match.team2.id);
             break;
          }
        }
      });
    } else {
      let gIdx = 0;
      ['U50', 'O50'].forEach(cat => {
        if (!groups[cat]) return;
        Object.keys(groups[cat]).sort().forEach(groupName => {
          const groupTeams = groups[cat][groupName];
          const courtNum = (gIdx % COURTS) + 1;
          let pairs = [];
          for (let i = 0; i < groupTeams.length; i++) for (let j = i + 1; j < groupTeams.length; j++) pairs.push({ t1: groupTeams[i], t2: groupTeams[j] });
          let orderedPairs = []; let lastPlayed = {};
          
          while(pairs.length > 0) {
            let bestIdx = 0; let bestScore = -1;
            for(let i=0; i<pairs.length; i++) {
               let dist1 = lastPlayed[pairs[i].t1.id] !== undefined ? orderedPairs.length - lastPlayed[pairs[i].t1.id] : 999;
               let dist2 = lastPlayed[pairs[i].t2.id] !== undefined ? orderedPairs.length - lastPlayed[pairs[i].t2.id] : 999;
               let score = Math.min(dist1, dist2);
               if(score > bestScore) { bestScore = score; bestIdx = i; }
            }
            let selected = pairs.splice(bestIdx, 1)[0];
            orderedPairs.push(selected);
            lastPlayed[selected.t1.id] = orderedPairs.length - 1; lastPlayed[selected.t2.id] = orderedPairs.length - 1;
          }
          orderedPairs.forEach((p, idx) => {
            newMatches.push({ id: generateId(), day: 1, time: 'Flexibel', court: courtNum, category: cat, stage: 'Group', groupName, team1: p.t1, team2: p.t2, score: null, winnerId: null, matchOrder: idx + 1 });
          });
          gIdx++;
        });
      });
    }

    if (tournamentDays === 1) {
      if (mode === 'traditional') {
        const usedTimes = newMatches.map(m => m.time).filter(t => t);
        if (usedTimes.length > 0) setDay2Start(generateTimeSlots(usedTimes.sort().reverse()[0], 2)[1]);
      } else {
        let maxTeams = 0;
        ['U50', 'O50'].forEach(cat => { if (groups[cat]) Object.values(groups[cat]).forEach(gTeams => { if (gTeams.length > maxTeams) maxTeams = gTeams.length; }); });
        const totalMinutes = ((maxTeams * (maxTeams - 1)) / 2) * 90;
        let [hours, minutes] = day1Start.split(':').map(Number);
        hours += Math.floor(totalMinutes / 60); minutes += totalMinutes % 60;
        if (minutes >= 60) { hours += Math.floor(minutes / 60); minutes %= 60; }
        setDay2Start(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      }
    }
    setMatches([...newMatches, ...matches.filter(m => m.stage !== 'Group')]);
    setSchedulePrompt(false);
  };

  const handleKoGeneration = () => {
    let needsPrompt = false;
    ['U50', 'O50'].forEach(cat => {
      if (!groups[cat]) return;
      const groupCount = Object.keys(groups[cat]).length;
      if (groupCount > 0 && groupCount * koQualifyCount < 8) needsPrompt = true;
    });
    if (needsPrompt && simState === 'idle') setKoPrompt(true);
    else generateKO(koQualifyCount, false);
  };

  const generateKO = (qualCount, useWildcards = false) => {
    setKoQualifyCount(qualCount);
    const newBrackets = { U50: null, O50: null };
    let newMatches = [...matches.filter(m => m.stage === 'Group')];
    const targetDay = tournamentDays;
    const slots = generateTimeSlots(day2Start, 10);
    
    ['U50', 'O50'].forEach(cat => {
      if (!standings[cat] || Object.keys(standings[cat]).length === 0) return;
      let qualifiers = []; let remainingTeams = []; 

      Object.keys(standings[cat]).sort().forEach(gName => {
        standings[cat][gName].forEach((team, i) => {
           if (i < qualCount) qualifiers.push({ ...team, seedType: `${i+1}st` });
           else remainingTeams.push(team);
        });
      });

      if (qualifiers.length === 0) return;

      if (useWildcards && qualifiers.length < 8) {
         remainingTeams.sort((a, b) => {
           if (b.won !== a.won) return b.won - a.won;
           const aSetDiff = a.setsWon - a.setsLost; const bSetDiff = b.setsWon - b.setsLost;
           if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
           return (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost);
         });
         qualifiers = [...qualifiers, ...remainingTeams.slice(0, 8 - qualifiers.length).map(t => ({ ...t, seedType: `Wildcard` }))];
      }

      qualifiers.sort((a, b) => {
        if (a.seedType !== b.seedType) return a.seedType.localeCompare(b.seedType);
        if (b.won !== a.won) return b.won - a.won;
        return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
      });

      qualifiers = qualifiers.slice(0, 8);
      while (qualifiers.length < 8) qualifiers.push({ isBye: true, name: 'FREILOS' });

      const qfNodes = [
        { id: `qf1_${cat}`, team1: qualifiers[0], team2: qualifiers[7], next: `sf1_${cat}`, nextLoser: `place_sf1_${cat}` },
        { id: `qf2_${cat}`, team1: qualifiers[3], team2: qualifiers[4], next: `sf1_${cat}`, nextLoser: `place_sf1_${cat}` },
        { id: `qf3_${cat}`, team1: qualifiers[2], team2: qualifiers[5], next: `sf2_${cat}`, nextLoser: `place_sf2_${cat}` },
        { id: `qf4_${cat}`, team1: qualifiers[1], team2: qualifiers[6], next: `sf2_${cat}`, nextLoser: `place_sf2_${cat}` }
      ];

      const sfNodes = [
        { id: `sf1_${cat}`, title: 'Halbfinale 1', team1: null, team2: null, next: `final_${cat}`, nextLoser: `place_3_${cat}` },
        { id: `sf2_${cat}`, title: 'Halbfinale 2', team1: null, team2: null, next: `final_${cat}`, nextLoser: `place_3_${cat}` }
      ];

      const pSfNodes = [
        { id: `place_sf1_${cat}`, title: 'Platzierungsspiel, 5-8', team1: null, team2: null, next: `place_5_${cat}`, nextLoser: `place_7_${cat}` },
        { id: `place_sf2_${cat}`, title: 'Platzierungsspiel, 5-8', team1: null, team2: null, next: `place_5_${cat}`, nextLoser: `place_7_${cat}` }
      ];

      const finalNodes = [
        { id: `final_${cat}`, title: 'Finale', team1: null, team2: null },
        { id: `place_3_${cat}`, title: 'Spiel um Platz 3', team1: null, team2: null },
        { id: `place_5_${cat}`, title: 'Spiel um Platz 5', team1: null, team2: null },
        { id: `place_7_${cat}`, title: 'Spiel um Platz 7', team1: null, team2: null }
      ];

      const scheduleMatch = (id, stage, groupName, t1, t2, possibleSlots) => {
         if (t1?.isBye || t2?.isBye) {
           newMatches.push({ id, category: cat, stage, groupName, team1: t1, team2: t2, score: null, winnerId: null, nextMatchId: null, day: targetDay, time: null, court: null });
           return;
         }
         for (let slotIdx = 0; slotIdx < possibleSlots.length; slotIdx++) {
            const time = possibleSlots[slotIdx];
            const courtsUsed = newMatches.filter(m => m.day === targetDay && m.time === time).map(m => m.court);
            if (courtsUsed.length < COURTS) {
               let freeCourt = 1;
               while(courtsUsed.includes(freeCourt)) freeCourt++;
               newMatches.push({ id, category: cat, stage, groupName, team1: t1, team2: t2, score: null, winnerId: null, day: targetDay, time, court: freeCourt });
               return;
            }
         }
      };

      qfNodes.forEach(node => {
         const isRealMatch = !node.team1.isBye && !node.team2.isBye;
         if (isRealMatch) scheduleMatch(node.id, 'KO', 'Viertelfinale', node.team1, node.team2, [slots[0], slots[1]]);
         else newMatches.push({ id: node.id, category: cat, stage: 'KO', groupName: 'Viertelfinale', team1: node.team1, team2: node.team2, score: null, winnerId: null, nextMatchId: node.next, nextLoserId: node.nextLoser, day: targetDay, time: null, court: null });
      });

      [...sfNodes, ...pSfNodes].forEach(node => scheduleMatch(node.id, node.id.includes('place') ? 'Placement' : 'KO', node.title, null, null, [slots[1], slots[2], slots[3]]));
      finalNodes.forEach(node => scheduleMatch(node.id, node.id.includes('place') ? 'Placement' : 'KO', node.title, null, null, isolateGrandFinals && node.id.includes('final_') ? [slots[4], slots[5]] : [slots[3], slots[4]]));
      
      newMatches.forEach(m => {
          const qfNode = qfNodes.find(n => n.id === m.id); if (qfNode) { m.nextMatchId = qfNode.next; m.nextLoserId = qfNode.nextLoser; }
          const sfNode = [...sfNodes, ...pSfNodes].find(n => n.id === m.id); if (sfNode) { m.nextMatchId = sfNode.next; m.nextLoserId = sfNode.nextLoser; }
      });

      newBrackets[cat] = { qf: qfNodes, sf: sfNodes, pSf: pSfNodes, finals: finalNodes };
    });

    setBrackets(newBrackets); setMatches(newMatches); setKoPrompt(false);
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

    matches.filter(m => (m.stage === 'KO' || m.stage === 'Placement') && m.winnerId).forEach(m => {
       const winner = m.winnerId === m.team1.id ? m.team1 : m.team2;
       const loser = m.winnerId === m.team1.id ? m.team2 : m.team1;
       pushToNode(m.nextMatchId, winner); pushToNode(m.nextLoserId, loser);
    });

    ['U50', 'O50'].forEach(cat => {
      if(brackets[cat]) {
        brackets[cat].qf.forEach(qf => {
          if (qf.team1?.isBye) pushToNode(qf.next, qf.team2);
          if (qf.team2?.isBye) pushToNode(qf.next, qf.team1);
        });
      }
    });

    if (changesMade) setMatches(updatedMatches);
  }, [matches, brackets]);

  // --- REUSABLE MATCH BOX FOR KO TREE (No Wrapping, Aligned Scores) ---
  const BracketMatchBox = ({ matchId, title, fallbackNode, isMonitor = false }) => {
    const match = matches.find(m => m.id === matchId) || fallbackNode;
    
    // Theme colors dynamically applied based on view mode (TV vs Organizer)
    const cardBg = isMonitor ? 'bg-white/10' : 'bg-[var(--base-3)]';
    const cardBorder = isMonitor ? 'border-white/10' : 'border-[var(--base)]';
    const headerBg = isMonitor ? 'bg-black/20' : 'bg-[var(--base)]';
    const headerText = isMonitor ? 'text-[var(--contrast-3)]' : 'text-[var(--contrast-2)]';
    const textColor = isMonitor ? 'text-white' : 'text-[var(--contrast)]';
    const activeBg = isMonitor ? 'bg-[var(--tcw-green-light)]/20' : 'bg-[var(--tcw-green)]/10';
    const activeText = isMonitor ? 'text-[var(--tcw-green-light)]' : 'text-[var(--tcw-green-dark)]';
    const mutedText = isMonitor ? 'text-white/50' : 'text-[var(--contrast-3)]';

    if (!match) return <div className={`min-w-[20rem] h-24 border-2 border-dashed ${cardBorder} rounded-md ${cardBg} flex items-center justify-center ${headerText} text-sm font-bold m-2 backdrop-blur-sm`}>Offen</div>;
    
    const t1IsBye = match.team1?.isBye; const t2IsBye = match.team2?.isBye;
    if (t1IsBye && t2IsBye) return null;

    return (
      <div className={`min-w-[22rem] border ${cardBorder} rounded-md ${cardBg} shadow-sm overflow-hidden m-2 backdrop-blur-sm print:border-[var(--contrast-3)] print:shadow-none break-inside-avoid`}>
         <div className={`${headerBg} text-xs text-center py-2 font-extrabold ${headerText} uppercase tracking-wider`}>{title || formatMatchName(match.groupName)}</div>
         
         <div className={`p-3 border-b ${cardBorder} flex items-center justify-between ${match.winnerId === match.team1?.id ? `${activeBg} font-bold ${activeText}` : textColor}`}>
           <span className="whitespace-nowrap font-medium pr-4">{t1IsBye ? <span className="italic text-[var(--contrast-3)]">Freilos</span> : (match.team1?.name || 'Offen')}</span>
           {!t1IsBye && !t2IsBye && (
              <div className="flex shrink-0 w-24 justify-end space-x-1">
                 <span className="w-6 text-center font-bold">{match.score?.s1[0]}</span>
                 <span className="w-6 text-center font-bold">{match.score?.s2[0]}</span>
                 <span className="w-8 text-center font-bold text-[var(--tcw-orange)]">{match.score?.tb ? match.score.tb[0] : ''}</span>
              </div>
           )}
         </div>
         
         <div className={`p-3 flex items-center justify-between ${match.winnerId === match.team2?.id ? `${activeBg} font-bold ${activeText}` : textColor}`}>
           <span className="whitespace-nowrap font-medium pr-4">{t2IsBye ? <span className="italic text-[var(--contrast-3)]">Freilos</span> : (match.team2?.name || 'Offen')}</span>
           {!t1IsBye && !t2IsBye && (
              <div className="flex shrink-0 w-24 justify-end space-x-1">
                 <span className="w-6 text-center font-bold">{match.score?.s1[1]}</span>
                 <span className="w-6 text-center font-bold">{match.score?.s2[1]}</span>
                 <span className="w-8 text-center font-bold text-[var(--tcw-orange)]">{match.score?.tb ? match.score.tb[1] : ''}</span>
              </div>
           )}
         </div>
      </div>
    );
  };

  // --- RENDER PORTALS ---

  // LOGIN SCREEN
  if (appMode === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[var(--base-2)] text-[var(--contrast)] font-sans">
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800;900&family=Open+Sans:wght@400;500;600;700&display=swap');
          :root { --contrast: #222222; --contrast-2: #575760; --contrast-3: #b2b2be; --base: #f0f0f0; --base-2: #f7f8f9; --base-3: #ffffff; --tcw-green: #008236; --tcw-orange: #CC4E00; --tcw-yellow: #ECF241; --tcw-green-dark: #003616; --tcw-green-light: #00D95A; --global-color-12: #ffa347; --global-color-13: #db7833; }
          body { font-family: 'Open Sans', sans-serif; }
          h1, h2, h3, h4, h5, h6, .font-heading { font-family: 'Montserrat', sans-serif; }
        `}} />
        <div className="absolute inset-0 z-0"><img src={BRAND.banner} alt="Background" className="w-full h-full object-cover opacity-5" /></div>
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          <img src={BRAND.logo} alt="Logo" className="h-24 w-auto drop-shadow-md mb-8" />
          <div className="bg-[var(--base-3)] p-8 rounded-lg shadow-lg w-full border border-[var(--base)] mb-6 relative overflow-hidden">
            {authError && <div className="absolute top-0 left-0 w-full bg-[var(--tcw-orange)] text-white text-xs font-bold text-center py-2">{authError}</div>}
            <h2 className="text-2xl font-extrabold text-center mt-2 mb-2 font-heading">{BRAND.name} Portal</h2>
            <p className="text-center text-[var(--contrast-2)] text-sm mb-6 font-medium">Veranstalter-Passwort oder Team-PIN</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-3 border border-[var(--contrast-3)] rounded-md text-center tracking-widest font-bold focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none transition" placeholder="Passwort / PIN" required />
              <button type="submit" className="w-full bg-[var(--tcw-green)] text-white p-3 rounded-md font-bold hover:bg-[var(--tcw-green-dark)] transition">Anmelden</button>
            </form>
          </div>

          <div className="bg-[var(--contrast)] p-8 rounded-lg shadow-lg w-full text-center text-white">
             <Tv className="h-10 w-10 text-[var(--tcw-green-light)] mx-auto mb-4" />
             <h3 className="font-bold text-xl mb-2 font-heading">TV-Monitor</h3>
             <p className="text-sm text-[var(--contrast-3)] mb-6 font-medium">Live-Turnier-Dashboard für große Bildschirme.</p>
             <button onClick={() => setAppMode('monitor')} className="w-full bg-white/10 text-white p-3 rounded-md font-bold hover:bg-white/20 transition flex items-center justify-center">
               <Monitor size={20} className="mr-2" /> Monitor starten
             </button>
          </div>
        </div>
      </div>
    );
  }

  // PLAYER PORTAL
  if (appMode === 'player') {
    const myTeam = teams.find(t => t.id === loggedInTeamId);
    if (!myTeam) { setAppMode('login'); return null; }
    let myGroupTeams = []; let myGroupName = 'Offen';
    if (groups[myTeam.category]) {
      Object.keys(groups[myTeam.category]).forEach(name => {
        if (groups[myTeam.category][name].find(t => t.id === myTeam.id)) { myGroupTeams = standings[myTeam.category][name] || groups[myTeam.category][name]; myGroupName = name; }
      });
    }
    const myMatches = matches.filter(m => m.team1?.id === myTeam.id || m.team2?.id === myTeam.id);
    const scheduledMatches = myMatches.filter(m => m.time !== null && !m.team1?.isBye && !m.team2?.isBye).sort((a,b) => {
      if(a.day !== b.day) return a.day - b.day; return a.time.localeCompare(b.time);
    });
    const finalMatch = matches.find(m => m.category === myTeam.category && m.id && m.id.startsWith('final_'));
    const rankingAvailable = finalMatch && finalMatch.winnerId;

    return (
      <div className="bg-[var(--base-2)] min-h-screen flex justify-center text-[var(--contrast)] font-sans">
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800;900&family=Open+Sans:wght@400;500;600;700&display=swap');
          :root { --contrast: #222222; --contrast-2: #575760; --contrast-3: #b2b2be; --base: #f0f0f0; --base-2: #f7f8f9; --base-3: #ffffff; --tcw-green: #008236; --tcw-orange: #CC4E00; --tcw-yellow: #ECF241; --tcw-green-dark: #003616; --tcw-green-light: #00D95A; --global-color-12: #ffa347; --global-color-13: #db7833; }
          body { font-family: 'Open Sans', sans-serif; }
          h1, h2, h3, h4, h5, h6, .font-heading { font-family: 'Montserrat', sans-serif; }
        `}} />
        <div className="w-full max-w-[400px] bg-[var(--base-3)] min-h-screen flex flex-col shadow-2xl relative">
          
          <header className="relative bg-[var(--base-3)] text-[var(--contrast)] pt-8 pb-6 px-5 z-10 border-b border-[var(--base)]">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <img src={BRAND.logo} alt="Logo" className="h-12 w-auto drop-shadow-sm" />
                <button onClick={handleLogout} className="text-[var(--contrast-3)] hover:text-[var(--tcw-orange)] p-2">
                  <LogOut size={20} />
                </button>
              </div>
              <h1 className="text-2xl font-bold leading-tight mb-1 font-heading">{myTeam.name}</h1>
              <div className="flex items-center space-x-2 text-[var(--contrast-2)] text-sm font-medium">
                 <span>{CATEGORIES[myTeam.category]}</span><span>•</span><span className="truncate">{myTeam.clubs.join(' / ')}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-5 pb-24 bg-[var(--base-2)]">
            {playerTab === 'matches' && (
              <div className="space-y-4">
                <h2 className="text-lg font-extrabold flex items-center font-heading"><Calendar className="mr-2 text-[var(--tcw-green)]" size={20}/> Mein Spielplan</h2>
                {scheduledMatches.length === 0 ? (
                  <div className="bg-[var(--base-3)] p-6 rounded-lg text-center text-[var(--contrast-2)] font-medium shadow-sm border border-[var(--base)]">Noch keine Spiele geplant.</div>
                ) : (
                  scheduledMatches.map(m => {
                    const isWinner = m.winnerId === myTeam.id; const isLoser = m.winnerId && m.winnerId !== myTeam.id;
                    const opp = m.team1.id === myTeam.id ? m.team2 : m.team1;
                    const matchDate = m.day === 1 ? tournamentStartDate : addDays(tournamentStartDate, 1);
                    return (
                      <div key={m.id} className={`bg-[var(--base-3)] rounded-lg p-4 shadow-sm border border-[var(--base)] border-l-4 ${isWinner ? 'border-l-[var(--tcw-green)]' : isLoser ? 'border-l-[var(--tcw-orange)]' : 'border-l-[var(--contrast-3)]'}`}>
                        <div className="flex justify-between items-center text-xs font-bold text-[var(--contrast-2)] uppercase tracking-wider mb-3 pb-2 border-b border-[var(--base)]">
                          <span>{formatDate(matchDate)} • {m.time} • Platz {m.court}</span>
                          <span className="text-[var(--tcw-green-dark)] bg-[var(--tcw-green)]/10 px-2 py-0.5 rounded">{formatMatchName(m.groupName)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="text-xs text-[var(--contrast-2)] mb-1 font-medium">Gegner</div>
                            <div className="font-bold text-[var(--contrast)] text-sm whitespace-nowrap overflow-hidden text-ellipsis">{opp.name}</div>
                          </div>
                          <div className="text-right pl-4 border-l border-[var(--base)]">
                            {m.score ? (
                               <div className={`font-black text-lg ${isWinner ? 'text-[var(--tcw-green)]' : 'text-[var(--tcw-orange)]'}`}>
                                  {m.score.s1[0]}:{m.score.s1[1]} <br/> {m.score.s2[0]}:{m.score.s2[1]}
                                  {m.score.tb && <span><br/>[{m.score.tb[0]}:{m.score.tb[1]}]</span>}
                               </div>
                            ) : (<span className="text-[var(--contrast-3)] font-bold text-sm">VS</span>)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {playerTab === 'group' && (
              <div className="space-y-4">
                <h2 className="text-lg font-extrabold flex items-center font-heading"><Shield className="mr-2 text-[var(--tcw-green)]" size={20}/> {myGroupName}</h2>
                <div className="bg-[var(--base-3)] rounded-lg shadow-sm border border-[var(--base)] overflow-hidden">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-[var(--base)] text-[var(--contrast-2)] text-xs uppercase">
                       <tr><th className="p-3">Pos</th><th className="p-3">Team</th><th className="p-3 text-center">S-N</th></tr>
                     </thead>
                     <tbody>
                       {myGroupTeams.map((t, idx) => (
                         <tr key={t.id} className={`border-b border-[var(--base)] last:border-0 ${t.id === myTeam.id ? 'bg-[var(--tcw-green)]/5' : ''}`}>
                           <td className="p-3 font-bold text-[var(--contrast-3)]">{idx+1}</td>
                           <td className={`p-3 truncate max-w-[120px] ${t.id === myTeam.id ? 'font-bold text-[var(--tcw-green-dark)]' : 'text-[var(--contrast)] font-medium'}`}>{t.name}</td>
                           <td className="p-3 text-center font-bold text-[var(--contrast)]">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              </div>
            )}

            {playerTab === 'rankings' && (
              <div className="space-y-4">
                <h2 className="text-lg font-extrabold flex items-center font-heading"><Award className="mr-2 text-[var(--tcw-yellow)]" size={20}/> Rangliste</h2>
                {!rankingAvailable ? (
                   <div className="bg-[var(--base-3)] p-6 rounded-lg text-center shadow-sm border border-[var(--base)] text-[var(--contrast-2)] font-medium">Die finale Rangliste wird veröffentlicht, sobald das Finale gespielt wurde.</div>
                ) : (
                  <div className="bg-[var(--base-3)] rounded-lg shadow-sm border border-[var(--base)] overflow-hidden">
                    {finalRankings[myTeam.category].map((item, idx) => (
                       <div key={item.team.id} className={`flex items-center p-3 border-b border-[var(--base)] last:border-0 ${item.team.id === myTeam.id ? 'bg-[var(--tcw-green)]/5 border-l-4 border-l-[var(--tcw-green)]' : ''}`}>
                         <div className="w-8 text-center font-extrabold text-[var(--contrast-3)]">{idx===0?'🏆':item.rank}</div>
                         <div className={`flex-1 pl-3 truncate ${item.team.id === myTeam.id ? 'font-bold text-[var(--tcw-green-dark)]' : 'text-[var(--contrast)] font-medium'}`}>{item.team.name}</div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>

          <nav className="absolute bottom-0 w-full bg-[var(--base-3)] border-t border-[var(--base)] flex justify-around p-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
             <button onClick={() => setPlayerTab('matches')} className={`flex flex-col items-center p-2 w-20 transition-colors ${playerTab === 'matches' ? 'text-[var(--tcw-green)]' : 'text-[var(--contrast-3)] hover:text-[var(--contrast-2)]'}`}>
               <Calendar size={22} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Spiele</span>
             </button>
             <button onClick={() => setPlayerTab('group')} className={`flex flex-col items-center p-2 w-20 transition-colors ${playerTab === 'group' ? 'text-[var(--tcw-green)]' : 'text-[var(--contrast-3)] hover:text-[var(--contrast-2)]'}`}>
               <Shield size={22} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Gruppe</span>
             </button>
             <button onClick={() => setPlayerTab('rankings')} className={`flex flex-col items-center p-2 w-20 transition-colors ${playerTab === 'rankings' ? 'text-[var(--tcw-green)]' : 'text-[var(--contrast-3)] hover:text-[var(--contrast-2)]'}`}>
               <Award size={22} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Rangliste</span>
             </button>
          </nav>
        </div>
      </div>
    );
  }

  // TV MONITOR MODE
  if (appMode === 'monitor') {
    const slide = monitorSlides[monitorSlideIdx] || { type: 'loading', title: 'Lade Daten...' };

    return (
      <div className="h-screen w-screen overflow-hidden bg-[var(--contrast)] text-white font-sans flex flex-col p-8">
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800;900&family=Open+Sans:wght@400;500;600;700&display=swap');
          :root { --contrast: #222222; --contrast-2: #575760; --contrast-3: #b2b2be; --base: #f0f0f0; --base-2: #f7f8f9; --base-3: #ffffff; --tcw-green: #008236; --tcw-orange: #CC4E00; --tcw-yellow: #ECF241; --tcw-green-dark: #003616; --tcw-green-light: #00D95A; --global-color-12: #ffa347; --global-color-13: #db7833; }
          body { font-family: 'Open Sans', sans-serif; background-color: var(--contrast); color: white; }
          h1, h2, h3, h4, h5, h6, .font-heading { font-family: 'Montserrat', sans-serif; }
        `}} />
        <header className="relative flex justify-between items-center mb-10 overflow-hidden rounded-xl border border-white/10 shrink-0 bg-white/5 shadow-2xl">
          <div className="relative z-10 flex w-full justify-between items-center p-6">
              <div className="flex items-center space-x-6">
                <img src={BRAND.logo} alt="Logo" className="h-20 w-auto drop-shadow-lg" />
                <div>
                  <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-md font-heading">{BRAND.name}</h1>
                  <div className="text-2xl font-bold text-[var(--tcw-green-light)] uppercase tracking-widest mt-2 flex items-center">
                    {slide.title} <span className="text-white/50 ml-3 text-lg">{slide.pageInfo}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <button onClick={handleLogout} className="flex items-center space-x-2 text-white/50 hover:text-white bg-black/20 px-4 py-2 rounded-md transition border border-white/10 text-lg">
                  <Lock size={20} /> <span>Veranstalter</span>
                </button>
                <div className="text-4xl font-bold text-white bg-black/20 px-6 py-3 rounded-md shadow-inner border border-white/10 min-w-[160px] text-center font-heading">
                  {currentTime}
                </div>
              </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {slide.type === 'schedule' && (
            <div className="grid grid-cols-2 gap-8 h-full content-start px-4">
              {[0, 1].map(colIdx => (
                <div key={colIdx} className="flex flex-col space-y-5">
                   {(slide.data || []).slice(colIdx * 5, (colIdx + 1) * 5).map(m => {
                      const matchDate = m.day === 1 ? tournamentStartDate : addDays(tournamentStartDate, 1);
                      return (
                      <div key={m.id} className="bg-white/5 rounded-xl overflow-hidden shadow-xl border border-white/10 p-5 backdrop-blur-sm">
                         <div className="text-white/50 font-bold mb-4 flex justify-between text-lg border-b border-white/10 pb-3 uppercase tracking-wider">
                            <span className="text-white">{formatDate(matchDate)} • {m.time} • Platz {m.court}</span>
                            <span className="text-[var(--tcw-green-light)]">{CATEGORIES[m.category]?.substring(0,3)} {m.category} • {formatMatchName(m.groupName)}</span>
                         </div>
                         <div className="flex justify-between items-center text-3xl font-heading">
                            <span className={`whitespace-nowrap w-5/12 text-right overflow-hidden text-ellipsis ${m.winnerId === m.team1?.id ? 'text-white font-extrabold' : 'text-white/60'}`}>{m.team1?.name || 'Offen'}</span>
                            <span className="w-2/12 text-center bg-black/40 py-2 rounded-lg font-bold tracking-widest shadow-inner text-[var(--tcw-green-light)]">
                               {!m.score ? <span className="text-white/30 text-2xl">VS</span> : `${m.score.s1[0]}:${m.score.s1[1]}  ${m.score.s2[0]}:${m.score.s2[1]}` + (m.score.tb ? ` [${m.score.tb[0]}:${m.score.tb[1]}]` : '')}
                            </span>
                            <span className={`whitespace-nowrap w-5/12 text-left overflow-hidden text-ellipsis ${m.winnerId === m.team2?.id ? 'text-white font-extrabold' : 'text-white/60'}`}>{m.team2?.name || 'Offen'}</span>
                         </div>
                      </div>
                      )
                   })}
                </div>
              ))}
            </div>
          )}

          {slide.type === 'groups' && (
             <div className="grid grid-cols-2 gap-8 h-full content-start px-4">
               {(slide.data || []).map(([groupName, groupTeams]) => (
                 <div key={groupName} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm">
                   <div className="bg-black/40 p-4 text-3xl font-extrabold text-center text-white tracking-widest font-heading">{groupName}</div>
                   <table className="w-full text-2xl">
                     <thead className="bg-white/5 text-white/50 border-b border-white/10"><tr><th className="p-4 text-left pl-8">Team</th><th className="p-4 text-center w-32">S-N</th><th className="p-4 text-center w-32">Sätze</th></tr></thead>
                     <tbody>
                       {(standings[slide.cat]?.[groupName] || groupTeams).map((t, idx) => (
                         <tr key={t.id} className="border-b border-white/5 last:border-0">
                           <td className="p-5 pl-8 font-medium text-white truncate flex items-center"><span className="text-white/30 w-10 font-bold">{idx+1}</span> {t.name}</td>
                           <td className="p-5 text-center font-bold text-white bg-black/20">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                           <td className="p-5 text-center text-white/50 bg-black/20">{t.setsWon !== undefined ? `${t.setsWon}:${t.setsLost}` : '0:0'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ))}
             </div>
          )}

          {slide.type === 'bracket_main' && brackets[slide.cat] && (
             <div className="h-full flex items-center justify-center pb-8 overflow-x-auto">
                 <div className="flex items-center space-x-12 min-w-max relative px-12">
                     <div className="flex flex-col justify-around space-y-6 h-[75vh]">
                        {brackets[slide.cat].qf.map((qfRef, i) => <div key={i} className="relative"><BracketMatchBox matchId={qfRef.id} title={`Viertelfinale ${i+1}`} fallbackNode={qfRef} isMonitor={true} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-white/20"></div></div>)}
                     </div>
                     <div className="flex flex-col justify-around h-[75vh]">
                        {brackets[slide.cat].sf.map((sfRef, i) => <div key={i} className="relative"><div className="absolute top-[-100px] -left-6 bottom-[50%] border-l-2 border-white/20 rounded-tl-xl"></div><div className="absolute bottom-[-100px] -left-6 top-[50%] border-l-2 border-white/20 rounded-bl-xl"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-white/20"></div><BracketMatchBox matchId={sfRef.id} title={sfRef.title} fallbackNode={sfRef} isMonitor={true} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-white/20"></div></div>)}
                     </div>
                     <div className="flex flex-col justify-center h-[75vh]">
                        <div className="relative"><div className="absolute top-[-180px] -left-6 bottom-[50%] border-l-2 border-white/20 rounded-tl-xl"></div><div className="absolute bottom-[-180px] -left-6 top-[50%] border-l-2 border-white/20 rounded-bl-xl"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-white/20"></div><BracketMatchBox matchId={brackets[slide.cat].finals[0].id} title="FINALE" fallbackNode={brackets[slide.cat].finals[0]} isMonitor={true} /></div>
                     </div>
                 </div>
             </div>
          )}

          {slide.type === 'bracket_placement' && brackets[slide.cat] && (
             <div className="h-full flex justify-center items-center pb-12 overflow-x-auto">
                 <div className="flex items-start space-x-16 min-w-max">
                     <div className="flex flex-col justify-around space-y-10">
                        {brackets[slide.cat].pSf.map((pSfRef, i) => <BracketMatchBox key={i} matchId={pSfRef.id} title={pSfRef.title} fallbackNode={pSfRef} isMonitor={true} />)}
                        <BracketMatchBox matchId={brackets[slide.cat].finals[1].id} title="Spiel um Platz 3" fallbackNode={brackets[slide.cat].finals[1]} isMonitor={true} />
                     </div>
                     <div className="flex flex-col justify-around space-y-10">
                        <BracketMatchBox matchId={brackets[slide.cat].finals[2].id} title="Spiel um Platz 5" fallbackNode={brackets[slide.cat].finals[2]} isMonitor={true} />
                        <BracketMatchBox matchId={brackets[slide.cat].finals[3].id} title="Spiel um Platz 7" fallbackNode={brackets[slide.cat].finals[3]} isMonitor={true} />
                     </div>
                 </div>
             </div>
          )}

          {slide.type === 'rankings' && (
             <div className="grid grid-cols-2 gap-10 h-full content-start px-4">
                <div className="flex flex-col space-y-6">
                   {(slide.data || []).slice(0, 6).map(item => (
                      <div key={item.team.id} className={`rounded-xl border flex items-center p-6 shadow-xl backdrop-blur-sm ${item.rank === 1 ? 'bg-[var(--tcw-yellow)]/10 border-[var(--tcw-yellow)]/30' : item.rank === 2 ? 'bg-white/10 border-white/20' : item.rank === 3 ? 'bg-[var(--global-color-12)]/10 border-[var(--global-color-12)]/30' : 'bg-white/5 border-white/10'}`}>
                         <div className={`text-5xl font-black w-24 text-center font-heading ${item.rank === 1 ? 'text-[var(--tcw-yellow)]' : item.rank === 2 ? 'text-white' : item.rank === 3 ? 'text-[var(--global-color-12)]' : 'text-white/30'}`}>
                            {item.rank === 1 ? '🏆' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                         </div>
                         <div className="flex-1 text-4xl font-bold text-white truncate pl-6 pr-2 font-heading">{item.team.name}</div>
                         <div className="text-white/50 text-2xl truncate max-w-[250px]">{item.team.clubs.join(' / ')}</div>
                      </div>
                   ))}
                </div>
                <div className="flex flex-col space-y-6">
                   {(slide.data || []).slice(6, 12).map(item => (
                      <div key={item.team.id} className="bg-white/5 rounded-xl border border-white/10 flex items-center p-6 shadow-xl backdrop-blur-sm">
                         <div className="text-5xl font-black text-white/30 w-24 text-center font-heading">{item.rank}</div>
                         <div className="flex-1 text-4xl font-bold text-white truncate pl-6 pr-2 font-heading">{item.team.name}</div>
                         <div className="text-white/50 text-2xl truncate max-w-[250px]">{item.team.clubs.join(' / ')}</div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {slide.type === 'idle' && (
             <div className="flex items-center justify-center h-full flex-col text-white/30 space-y-8">
                <Trophy size={140} className="text-white/10" />
                <h2 className="text-5xl font-bold font-heading text-white/50">Turnier startet in Kürze</h2>
                <p className="text-2xl">Die Bildschirme werden automatisch aktualisiert, sobald Daten verfügbar sind.</p>
             </div>
          )}
        </main>
      </div>
    );
  }

  // ORGANIZER DASHBOARD
  return (
    <div className={`min-h-screen bg-[var(--base-2)] text-[var(--contrast)] font-sans pb-12 relative ${printView === 'sheets' ? 'bg-[var(--base-3)]' : ''}`}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800;900&family=Open+Sans:wght@400;500;600;700&display=swap');
        :root { --contrast: #222222; --contrast-2: #575760; --contrast-3: #b2b2be; --base: #f0f0f0; --base-2: #f7f8f9; --base-3: #ffffff; --tcw-green: #008236; --tcw-orange: #CC4E00; --tcw-yellow: #ECF241; --tcw-green-dark: #003616; --tcw-green-light: #00D95A; --global-color-12: #ffa347; --global-color-13: #db7833; }
        body { font-family: 'Open Sans', sans-serif; background-color: var(--base-2); color: var(--contrast); }
        h1, h2, h3, h4, h5, h6, .font-heading { font-family: 'Montserrat', sans-serif; }
        @media print { body { background: white; -webkit-print-color-adjust: exact; } .page-break-after { page-break-after: always; } .break-inside-avoid { break-inside: avoid; } @page { size: A3 landscape; margin: 1cm; } }
      `}} />
      
      <header className={`bg-[var(--base-3)] text-[var(--contrast)] shadow-sm border-b border-[var(--base)] ${printView === 'sheets' ? 'hidden' : 'print:hidden'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src={BRAND.logo} alt="Logo" className="h-12 w-auto drop-shadow-sm" />
            <div>
              <h1 className="text-2xl font-extrabold hidden md:block tracking-tight text-[var(--tcw-green)] font-heading">{BRAND.name}</h1>
              <div className="text-xs font-bold text-[var(--contrast-3)] uppercase tracking-widest hidden md:block">Turnier-Veranstalter</div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button onClick={handleSimulateTournament} disabled={simState !== 'idle'} className={`flex items-center space-x-2 px-4 py-2 rounded-md font-bold transition text-sm text-white shadow-sm ${simState !== 'idle' ? 'bg-[var(--contrast-3)] cursor-not-allowed' : 'bg-[var(--tcw-orange)] hover:bg-[var(--global-color-13)]'}`}>
              {simState !== 'idle' ? <Loader2 size={18} className="animate-spin" /> : <FastForward size={18} />} <span className="hidden sm:inline">Simulation</span>
            </button>
            <button onClick={() => window.print()} className="flex items-center space-x-2 bg-[var(--base-3)] hover:bg-[var(--base)] text-[var(--contrast)] px-4 py-2 rounded-md transition text-sm font-bold border border-[var(--contrast-3)] shadow-sm">
              <Printer size={18} /> <span className="hidden sm:inline">Drucken</span>
            </button>
            <button onClick={() => setAppMode('monitor')} className="flex items-center space-x-2 bg-[var(--contrast)] hover:bg-[var(--contrast-2)] text-white px-4 py-2 rounded-md transition text-sm font-bold shadow-sm">
              <Tv size={18} /> <span className="hidden sm:inline">Monitor</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-6 py-10 ${printView === 'sheets' ? 'hidden' : 'print:p-0 print:max-w-none'}`}>
        <div className="flex space-x-2 bg-[var(--base-3)] border border-[var(--base)] p-1.5 rounded-lg mb-10 print:hidden shadow-sm">
          {[{ id: 'registration', icon: Users, label: 'Anmeldung' }, { id: 'groups', icon: Shield, label: 'Gruppen' }, { id: 'schedule', icon: Calendar, label: 'Spielplan' }, { id: 'bracket', icon: Trophy, label: 'K.O.-Baum' }, { id: 'rankings', icon: Award, label: 'Rangliste' }].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md font-bold transition-all ${activeTab === t.id ? 'bg-[var(--tcw-green)]/10 text-[var(--tcw-green-dark)] shadow-sm' : 'text-[var(--contrast-2)] hover:bg-[var(--base)]'}`}>
              <t.icon size={18} /> <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-[var(--base-3)] rounded-xl shadow-md border border-[var(--base)] p-8 print:border-none print:shadow-none print:p-0">
          
          {/* TAB 1: REGISTRATION */}
          {activeTab === 'registration' && (
            <div className="space-y-10 print:hidden">
              <div className="flex justify-between items-center bg-[var(--base-2)] p-6 rounded-lg border border-[var(--base)]">
                <div>
                  <h2 className="text-xl font-extrabold font-heading">Turnier-Einstellungen</h2>
                  <p className="text-[var(--contrast-2)] text-sm mt-1 font-medium">Teams registrieren oder Testdaten laden.</p>
                </div>
                <button onClick={loadMockData} className="flex items-center space-x-2 bg-[var(--base-3)] text-[var(--contrast)] border border-[var(--contrast-3)] px-5 py-2.5 rounded-md shadow-sm hover:bg-[var(--base)] font-bold transition">
                  <Play size={18} className="text-[var(--tcw-green)]" /> <span>Test-Teams laden</span>
                </button>
              </div>

              <div className="bg-[var(--base-2)] p-6 rounded-lg border border-[var(--base)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-[var(--base)]">
                   <div className="flex flex-col space-y-2">
                     <label className="font-bold flex items-center text-[var(--contrast-2)]"><Calendar className="mr-2" size={18}/> Startdatum:</label>
                     <input type="date" value={tournamentStartDate} onChange={(e) => setTournamentStartDate(e.target.value)} className="p-3 border border-[var(--contrast-3)] rounded-md font-bold text-[var(--contrast)] focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none bg-white" />
                   </div>
                   <div className="flex flex-col space-y-2">
                     <label className="font-bold flex items-center text-[var(--contrast-2)]"><Clock className="mr-2" size={18}/> Turnierdauer:</label>
                     <select value={tournamentDays} onChange={(e) => setTournamentDays(Number(e.target.value))} className="p-3 border border-[var(--contrast-3)] rounded-md font-bold focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none bg-white">
                       <option value={1}>1-Tages-Turnier</option>
                       <option value={2}>2-Tages-Turnier</option>
                     </select>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col space-y-2">
                     <label className="font-bold text-[var(--contrast-2)]">{tournamentDays === 1 ? 'Turnier-Startzeit:' : 'Startzeit Tag 1:'}</label>
                     <input type="time" value={day1Start} onChange={(e) => setDay1Start(e.target.value)} className="p-3 border border-[var(--contrast-3)] rounded-md font-bold text-[var(--contrast)] focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none bg-white" />
                  </div>
                  {tournamentDays === 2 && (
                    <div className="flex flex-col space-y-2">
                       <label className="font-bold text-[var(--contrast-2)]">Startzeit Tag 2 (K.O.):</label>
                       <input type="time" value={day2Start} onChange={(e) => setDay2Start(e.target.value)} className="p-3 border border-[var(--contrast-3)] rounded-md font-bold text-[var(--contrast)] focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none bg-white" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="col-span-1 bg-[var(--base-2)] p-6 rounded-lg border border-[var(--base)] h-fit shadow-sm">
                  <h3 className="font-extrabold text-lg mb-6 flex items-center font-heading">
                    {editingTeam ? <Edit2 size={18} className="mr-2 text-[var(--tcw-orange)]"/> : <PlusCircle size={18} className="mr-2 text-[var(--tcw-green)]"/>} 
                    {editingTeam ? 'Team bearbeiten' : 'Neues Team'}
                  </h3>
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-[var(--contrast-3)] uppercase tracking-wider">Spieler 1</div>
                      <input value={regForm.p1Name} onChange={e=>setRegForm({...regForm, p1Name: e.target.value})} className="w-full p-3 border border-[var(--contrast-3)] rounded-md font-medium focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none" placeholder="Vollständiger Name" required />
                      <input value={regForm.p1Club} onChange={e=>setRegForm({...regForm, p1Club: e.target.value})} className="w-full p-3 border border-[var(--contrast-3)] rounded-md font-medium focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none" placeholder="Verein (Optional)" />
                    </div>
                    <div className="space-y-3 pt-3 border-t border-[var(--base)]">
                      <div className="text-xs font-bold text-[var(--contrast-3)] uppercase tracking-wider">Spieler 2</div>
                      <input value={regForm.p2Name} onChange={e=>setRegForm({...regForm, p2Name: e.target.value})} className="w-full p-3 border border-[var(--contrast-3)] rounded-md font-medium focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none" placeholder="Vollständiger Name" required />
                      <input value={regForm.p2Club} onChange={e=>setRegForm({...regForm, p2Club: e.target.value})} className="w-full p-3 border border-[var(--contrast-3)] rounded-md font-medium focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] outline-none" placeholder="Verein (Optional)" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--base)]">
                      <div><label className="block text-sm font-bold text-[var(--contrast-2)] mb-2">Spielstärke</label>
                        <select value={regForm.level} onChange={e=>setRegForm({...regForm, level: e.target.value})} className="w-full p-3 border border-[var(--contrast-3)] rounded-md font-medium outline-none focus:border-[var(--tcw-green)]">
                          <option value="3">3 - Gut</option><option value="2">2 - Mittel</option><option value="1">1 - Anfänger</option>
                        </select></div>
                      <div><label className="block text-sm font-bold text-[var(--contrast-2)] mb-2">Kategorie</label>
                        <select value={regForm.category} onChange={e=>setRegForm({...regForm, category: e.target.value})} className="w-full p-3 border border-[var(--contrast-3)] rounded-md font-medium outline-none focus:border-[var(--tcw-green)]">
                          <option value="U50">U50</option><option value="O50">O50</option>
                        </select></div>
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button type="submit" className={`flex-1 text-white py-3 rounded-md font-bold shadow-sm transition ${editingTeam ? 'bg-[var(--tcw-orange)] hover:bg-[var(--global-color-13)]' : 'bg-[var(--tcw-green)] hover:bg-[var(--tcw-green-dark)]'}`}>
                        {editingTeam ? 'Aktualisieren' : 'Team Registrieren'}
                      </button>
                      {editingTeam && <button type="button" onClick={() => {setEditingTeam(null); setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });}} className="px-5 bg-[var(--base-3)] text-[var(--contrast)] border border-[var(--contrast-3)] rounded-md font-bold hover:bg-[var(--base)] transition">Abbruch</button>}
                    </div>
                  </form>
                </div>
                
                <div className="col-span-1 lg:col-span-2">
                  <h3 className="font-extrabold text-lg mb-6 font-heading">Registrierte Teams ({teams.length})</h3>
                  <div className="overflow-auto max-h-[700px] border border-[var(--base)] rounded-lg shadow-sm bg-[var(--base-3)]">
                    <table className="w-full text-left text-sm table-fixed">
                      <thead className="bg-[var(--base)] sticky top-0 z-10 text-[var(--contrast-2)] border-b border-[var(--base)]">
                        <tr>
                          <th className="p-4 w-1/3 font-bold">Team</th>
                          <th className="p-4 w-1/4 font-bold">Vereine</th>
                          <th className="p-4 w-20 font-bold">Kat</th>
                          <th className="p-4 w-24 text-center font-bold">PIN</th>
                          <th className="p-4 w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.length === 0 ? <tr><td colSpan="5" className="p-10 text-center text-[var(--contrast-3)] font-medium">Noch keine Teams registriert.</td></tr> : 
                         teams.map((t) => (
                          <tr key={t.id} className="border-b border-[var(--base)] last:border-0 hover:bg-[var(--base-2)] transition">
                            <td className="p-4 font-bold truncate text-[var(--contrast)]">{t.name}</td>
                            <td className="p-4 text-xs font-medium text-[var(--contrast-2)] truncate">{t.clubs.join(' / ') || '-'}</td>
                            <td className="p-4"><span className="px-2 py-1 rounded-md text-xs font-bold bg-[var(--base)] text-[var(--contrast-2)]">{t.category}</span></td>
                            <td className="p-4 text-center font-mono font-bold text-[var(--tcw-green-dark)] bg-[var(--tcw-green)]/10 rounded-md">{t.pin}</td>
                            <td className="p-4 text-right space-x-3">
                               <button onClick={() => handleEdit(t)} className="text-[var(--contrast-3)] hover:text-[var(--tcw-green)] transition"><Edit2 size={18}/></button>
                               <button onClick={() => confirmDelete === t.id ? handleDelete(t.id) : setConfirmDelete(t.id)} className={`transition ${confirmDelete === t.id ? 'text-white bg-[var(--tcw-orange)] px-2 py-1 rounded-md font-bold shadow-sm' : 'text-[var(--contrast-3)] hover:text-[var(--tcw-orange)]'}`}>
                                  {confirmDelete === t.id ? 'Sicher?' : <Trash2 size={18}/>}
                               </button>
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
            <div className="space-y-10">
              <div className="flex justify-between items-center print:hidden bg-[var(--base-2)] p-6 rounded-lg border border-[var(--base)]">
                <p className="text-[var(--contrast-2)] font-medium">Gruppen werden nach Stärke und Vereinen ausbalanciert.</p>
                <div className="space-x-4">
                   <button onClick={generateGroups} disabled={teams.length < 4} className="bg-[var(--base-3)] text-[var(--contrast)] hover:bg-[var(--base)] px-5 py-2.5 rounded-md font-bold disabled:opacity-50 transition border border-[var(--contrast-3)] shadow-sm">1. Gruppen Generieren</button>
                   <button onClick={() => setSchedulePrompt(true)} disabled={Object.keys(groups.U50).length === 0 && Object.keys(groups.O50).length === 0} className="bg-[var(--tcw-green)] text-white hover:bg-[var(--tcw-green-dark)] px-5 py-2.5 rounded-md font-bold shadow-sm disabled:opacity-50 transition">2. Spielplan erstellen</button>
                </div>
              </div>

              {['U50', 'O50'].map(cat => (
                 groups[cat] && Object.keys(groups[cat]).length > 0 && (
                   <div key={cat} className="mb-12 page-break-after">
                     <h2 className="text-2xl font-extrabold mb-8 border-b border-[var(--base)] pb-3 font-heading text-[var(--tcw-green)]">
                       {CATEGORIES[cat]}
                     </h2>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {Object.keys(groups[cat]).sort().map((groupName) => (
                          <div key={groupName} className="border border-[var(--base)] rounded-lg overflow-hidden shadow-sm bg-[var(--base-3)]">
                            <div className="bg-[var(--base-2)] p-4 font-extrabold text-[var(--contrast)] border-b border-[var(--base)] font-heading">{groupName}</div>
                            <table className="w-full text-sm text-left table-fixed">
                              <thead className="bg-[var(--base-3)] text-[var(--contrast-3)] uppercase text-xs border-b border-[var(--base)]">
                                <tr>
                                  <th className="p-4 w-16">Pos</th>
                                  <th className="p-4">Team</th>
                                  <th className="p-4 text-center w-20">S-N</th>
                                  <th className="p-4 text-center w-24">Sätze</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(standings[cat][groupName] || groups[cat][groupName]).map((t, index) => (
                                  <tr key={t.id} className="border-b border-[var(--base)] last:border-0 hover:bg-[var(--base-2)] transition">
                                    <td className="p-4 font-bold text-[var(--contrast-3)] text-center">{index + 1}</td>
                                    <td className="p-4 truncate">
                                      <div className="font-bold text-[var(--contrast)] truncate">{t.name}</div>
                                      <div className="text-xs font-medium text-[var(--contrast-2)] truncate mt-1">{t.clubs.join(' / ')}</div>
                                    </td>
                                    <td className="p-4 text-center font-bold text-[var(--contrast)]">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                                    <td className="p-4 text-center font-medium text-[var(--contrast-2)]">{t.setsWon !== undefined ? `${t.setsWon}:${t.setsLost}` : '0:0'}</td>
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
               <div className="flex justify-between items-center mb-8 print:hidden">
                 <h2 className="text-2xl font-extrabold font-heading text-[var(--tcw-green)]">Spielplan</h2>
                 <div className="flex space-x-4">
                   {matches.some(m => m.day === 1 && m.time === 'Flexibel') && <button onClick={() => { setPrintView('sheets'); setTimeout(() => { window.print(); setPrintView('normal'); }, 150); }} className="bg-[var(--base-3)] border border-[var(--contrast-3)] text-[var(--contrast)] px-5 py-2.5 rounded-md font-bold hover:bg-[var(--base)] transition shadow-sm flex items-center"><Printer size={18} className="mr-2"/> Gruppen-Bögen drucken</button>}
                   <button onClick={handleKoGeneration} disabled={matches.filter(m => m.stage === 'Group' && !m.winnerId).length > 0 || matches.length === 0} className={`px-5 py-2.5 rounded-md font-bold transition flex items-center shadow-sm ${matches.filter(m => m.stage === 'Group' && !m.winnerId).length === 0 && matches.length > 0 ? 'bg-[var(--tcw-green)] text-white hover:bg-[var(--tcw-green-dark)]' : 'bg-[var(--base-2)] border border-[var(--contrast-3)] text-[var(--contrast-3)] cursor-not-allowed'}`}>
                      <Trophy size={18} className="mr-2"/> K.O.-Baum erstellen
                   </button>
                 </div>
               </div>

               <div className="space-y-12">
                 {[1, 2].map(day => {
                    const dayMatches = matches.filter(m => m.day === day && m.time !== null).sort((a,b) => {
                       if (a.time === 'Flexibel' && b.time === 'Flexibel') {
                          if (a.court !== b.court) return (a.court || 0) - (b.court || 0);
                          if (a.groupName !== b.groupName) return a.groupName.localeCompare(b.groupName);
                          return (a.matchOrder || 0) - (b.matchOrder || 0);
                       }
                       if (a.time === 'Flexibel') return -1;
                       if (b.time === 'Flexibel') return 1;
                       return a.time.localeCompare(b.time);
                    });
                    const unscheduled = matches.filter(m => m.day === day && m.time === null);
                    if (dayMatches.length === 0 && unscheduled.length === 0) return null;
                    const dateStr = day === 1 ? tournamentStartDate : addDays(tournamentStartDate, 1);
                    
                    return (
                      <div key={day} className="mb-8">
                        <h3 className="text-lg font-bold bg-[var(--base-2)] text-[var(--contrast)] p-5 rounded-t-lg border-x border-t border-[var(--base)] flex justify-between items-center font-heading">
                          <span>{tournamentDays === 1 ? 'Alle Spiele (1-Tages-Turnier)' : `Tag ${day} (${formatDate(dateStr)}) ${day===1 ? '- Gruppenphase' : '- K.O. Runde'}`}</span>
                        </h3>
                        <div className="border border-[var(--base)] rounded-b-lg overflow-hidden bg-[var(--base-3)] shadow-sm">
                          <table className="w-full text-sm table-fixed">
                            <thead className="bg-[var(--base-3)] text-[var(--contrast-3)] uppercase text-xs border-b border-[var(--base)]">
                              <tr>
                                <th className="p-4 text-left w-24">Zeit</th>
                                <th className="p-4 text-left w-24">Platz</th>
                                <th className="p-4 text-left w-40">Phase</th>
                                <th className="p-4 text-right">Team 1</th>
                                <th className="p-4 text-center w-48">Ergebnis</th>
                                <th className="p-4 text-left">Team 2</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...dayMatches, ...unscheduled].map((m) => {
                                const isT1Winner = m.winnerId === m.team1?.id;
                                const isT2Winner = m.winnerId === m.team2?.id;
                                const isMissingTeams = !m.team1 || !m.team2;
                                const isBye = m.team1?.isBye || m.team2?.isBye;
                                
                                return (
                                <tr key={m.id} className={`border-b border-[var(--base)] last:border-0 transition ${isMissingTeams || isBye || m.time === null ? '' : 'cursor-pointer hover:bg-[var(--base-2)]'}`} onClick={() => !isMissingTeams && !isBye && m.time !== null && setScoreModal(m)}>
                                  <td className={`p-4 font-bold ${m.time === null ? 'text-[var(--tcw-orange)]' : (m.time === 'Flexibel' ? 'text-[var(--contrast-3)] text-xs tracking-widest' : 'text-[var(--contrast)]')}`}>{m.time || 'Nicht angesetzt'}</td>
                                  <td className="p-4">{m.court ? <span className="bg-[var(--base)] text-[var(--contrast-2)] px-3 py-1 rounded-md text-xs font-bold border border-[var(--contrast-3)]/20">Platz {m.court}</span> : '-'}</td>
                                  <td className="p-4 text-xs truncate"><span className="block font-bold text-[var(--tcw-green-dark)]">{CATEGORIES[m.category]?.substring(0,3)} {m.category}</span><span className="text-[var(--contrast-2)] font-medium mt-1">{formatMatchName(m.groupName)}</span></td>
                                  <td className={`p-4 text-right truncate ${isT1Winner ? 'font-bold text-[var(--tcw-green)]' : 'font-medium text-[var(--contrast)]'}`}>
                                    {m.team1?.isBye ? <span className="text-[var(--contrast-3)] italic">Freilos</span> : (m.team1?.name || 'Offen')}
                                  </td>
                                  <td className="p-4 text-center bg-[var(--base-2)] border-x border-[var(--base)] font-bold text-[var(--contrast)]">
                                     {isBye ? <span className="text-[var(--contrast-3)] italic text-xs">KEIN SPIEL</span> : (!m.score ? <span className="text-[var(--contrast-3)]">vs</span> : `${m.score.s1[0]}:${m.score.s1[1]} | ${m.score.s2[0]}:${m.score.s2[1]}` + (m.score.tb ? ` [${m.score.tb[0]}:${m.score.tb[1]}]` : ''))}
                                  </td>
                                  <td className={`p-4 text-left truncate ${isT2Winner ? 'font-bold text-[var(--tcw-green)]' : 'font-medium text-[var(--contrast)]'}`}>
                                    {m.team2?.isBye ? <span className="text-[var(--contrast-3)] italic">Freilos</span> : (m.team2?.name || 'Offen')}
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
                 
                 const BracketMatchBox = ({ match, title }) => {
                   if (!match) return <div className="min-w-[22rem] h-24 border-2 border-dashed border-[var(--contrast-3)] rounded-lg bg-[var(--base-2)] flex items-center justify-center text-[var(--contrast-3)] text-sm font-bold m-2">Offen</div>;
                   const t1IsBye = match.team1?.isBye; const t2IsBye = match.team2?.isBye;
                   if (t1IsBye && t2IsBye) return null;
                   return (
                     <div className="min-w-[22rem] border border-[var(--base)] rounded-lg bg-[var(--base-3)] shadow-sm overflow-hidden m-2 print:border-[var(--contrast-3)] print:shadow-none break-inside-avoid">
                        <div className="bg-[var(--base-2)] text-xs text-center py-2 font-extrabold text-[var(--contrast-2)] border-b border-[var(--base)] uppercase tracking-wider">{title || formatMatchName(match.groupName)}</div>
                        
                        <div className={`p-3 border-b border-[var(--base)] flex items-center justify-between ${match.winnerId === match.team1?.id ? 'bg-[var(--tcw-green)]/10 font-bold text-[var(--tcw-green-dark)]' : 'text-[var(--contrast)]'}`}>
                          <span className="whitespace-nowrap font-medium pr-4">{t1IsBye ? <span className="italic text-[var(--contrast-3)]">Freilos</span> : (match.team1?.name || 'Offen')}</span>
                          {!t1IsBye && !t2IsBye && (
                             <div className="flex shrink-0 w-24 justify-end space-x-1">
                                <span className="w-6 text-center font-bold">{match.score?.s1[0]}</span>
                                <span className="w-6 text-center font-bold">{match.score?.s2[0]}</span>
                                <span className="w-8 text-center font-bold text-[var(--tcw-orange)]">{match.score?.tb ? match.score.tb[0] : ''}</span>
                             </div>
                          )}
                        </div>
                        
                        <div className={`p-3 flex items-center justify-between ${match.winnerId === match.team2?.id ? 'bg-[var(--tcw-green)]/10 font-bold text-[var(--tcw-green-dark)]' : 'text-[var(--contrast)]'}`}>
                          <span className="whitespace-nowrap font-medium pr-4">{t2IsBye ? <span className="italic text-[var(--contrast-3)]">Freilos</span> : (match.team2?.name || 'Offen')}</span>
                          {!t1IsBye && !t2IsBye && (
                             <div className="flex shrink-0 w-24 justify-end space-x-1">
                                <span className="w-6 text-center font-bold">{match.score?.s1[1]}</span>
                                <span className="w-6 text-center font-bold">{match.score?.s2[1]}</span>
                                <span className="w-8 text-center font-bold text-[var(--tcw-orange)]">{match.score?.tb ? match.score.tb[1] : ''}</span>
                             </div>
                          )}
                        </div>
                     </div>
                   );
                 };

                 return (
                   <div key={cat} className="mb-16 page-break-after">
                      <h2 className="text-2xl font-extrabold mb-8 border-b border-[var(--base)] pb-3 flex items-center font-heading text-[var(--tcw-green)]">
                         <Trophy className="mr-3"/> Hauptrunde: {CATEGORIES[cat]}
                      </h2>
                      <div className="flex items-center space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-6">
                           {brackets[cat].qf.map((qf, i) => ( <div key={i} className="relative"><BracketMatchBox match={getMatchData(qf.id)} title={`Viertelfinale ${i+1}`} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-[var(--contrast-3)]"></div></div> ))}
                        </div>
                        <div className="flex flex-col justify-around">
                           {brackets[cat].sf.map((sf, i) => ( <div key={i} className="relative"><div className="absolute top-[-50px] -left-6 bottom-[50%] border-l-2 border-[var(--contrast-3)] rounded-tl-lg"></div><div className="absolute bottom-[-50px] -left-6 top-[50%] border-l-2 border-[var(--contrast-3)] rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-[var(--contrast-3)]"></div><BracketMatchBox match={getMatchData(sf.id)} title={sf.title} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-[var(--contrast-3)]"></div></div> ))}
                        </div>
                        <div className="flex flex-col justify-center">
                           <div className="relative"><div className="absolute top-[-100px] -left-6 bottom-[50%] border-l-2 border-[var(--contrast-3)] rounded-tl-lg"></div><div className="absolute bottom-[-100px] -left-6 top-[50%] border-l-2 border-[var(--contrast-3)] rounded-bl-lg"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-[var(--contrast-3)]"></div><BracketMatchBox match={getMatchData(brackets[cat].finals[0].id)} title="FINALE" /></div>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold mt-12 mb-6 border-b border-[var(--base)] pb-3 font-heading text-[var(--contrast)]">Platzierungsspiele (Plätze 3-8)</h3>
                      <div className="flex items-start space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-6">
                           {brackets[cat].pSf.map((pSf, i) => ( <div key={i} className="relative"><BracketMatchBox match={getMatchData(pSf.id)} title={pSf.title} /></div> ))}
                        </div>
                        <div className="flex flex-col justify-around space-y-6">
                           <BracketMatchBox match={getMatchData(brackets[cat].finals[2].id)} title="Spiel um Platz 5" />
                           <BracketMatchBox match={getMatchData(brackets[cat].finals[3].id)} title="Spiel um Platz 7" />
                        </div>
                      </div>
                      <div className="mt-6"><BracketMatchBox match={getMatchData(brackets[cat].finals[1].id)} title="Spiel um Platz 3" /></div>
                   </div>
                 )
               })}
             </div>
          )}

          {/* TAB 5: RANKINGS */}
          {activeTab === 'rankings' && (
             <div className="space-y-12">
               {['U50', 'O50'].map(cat => {
                 if (!brackets[cat]) return null;
                 const finalMatch = matches.find(m => m.id === brackets[cat].finals[0].id);
                 if (!finalMatch || !finalMatch.winnerId) return (
                    <div key={cat} className="mb-8">
                       <h2 className="text-2xl font-extrabold mb-6 border-b border-[var(--base)] pb-3 flex items-center font-heading text-[var(--tcw-green)]">
                         <Award className="mr-3" /> Abschlussplatzierungen: {CATEGORIES[cat]}
                       </h2>
                       <div className="bg-[var(--base-2)] p-8 rounded-lg text-center font-medium border border-[var(--base)] text-[var(--contrast-2)] shadow-sm">Die finale Rangliste für diese Kategorie wird veröffentlicht, sobald das Finale abgeschlossen ist.</div>
                    </div>
                 );

                 if (!finalRankings[cat] || finalRankings[cat].length === 0) return null;
                 return (
                   <div key={cat} className="page-break-after">
                      <h2 className="text-2xl font-extrabold mb-6 border-b border-[var(--base)] pb-3 flex items-center font-heading text-[var(--tcw-green)]">
                        <Award className="mr-3 text-[var(--tcw-yellow)]" /> Abschlussplatzierungen: {CATEGORIES[cat]}
                      </h2>
                      <div className="border border-[var(--base)] rounded-lg overflow-hidden shadow-sm bg-[var(--base-3)]">
                        <table className="w-full text-left text-sm table-fixed">
                           <thead className="bg-[var(--base-2)] text-[var(--contrast-2)] uppercase text-xs border-b border-[var(--base)]">
                             <tr>
                               <th className="p-4 w-20 text-center border-r border-[var(--base)]">Platz</th>
                               <th className="p-4 w-1/3">Team</th>
                               <th className="p-4">Vereine</th>
                               <th className="p-4 w-32 text-center">Status</th>
                             </tr>
                           </thead>
                           <tbody>
                             {finalRankings[cat].map((item, idx) => (
                               <tr key={item.team.id} className={`border-b border-[var(--base)] last:border-0 hover:bg-[var(--base-2)] transition`}>
                                 <td className="p-4 text-center font-extrabold text-lg border-r border-[var(--base)] text-[var(--contrast-2)] font-heading">
                                   {idx === 0 ? '🏆 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : item.rank}
                                 </td>
                                 <td className="p-4 font-bold truncate text-[var(--tcw-green-dark)]">{item.team.name}</td>
                                 <td className="p-4 text-[var(--contrast-2)] font-medium truncate">{item.team.clubs.join(' / ')}</td>
                                 <td className="p-4 text-center">
                                   {idx < 8 ? <span className="bg-[var(--tcw-green)]/10 text-[var(--tcw-green-dark)] px-2 py-1 rounded-md text-xs font-bold border border-[var(--tcw-green)]/20">K.O.-Phase</span> : <span className="bg-[var(--base)] text-[var(--contrast-2)] px-2 py-1 rounded-md text-xs font-bold border border-[var(--contrast-3)]/20">Gruppen</span>}
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

      {/* MODALS */}
      {scoreModal && (
        <div className="fixed inset-0 bg-[var(--contrast)]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--base-3)] rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[var(--tcw-green)] p-5 flex justify-between items-center text-white">
               <h3 className="font-bold font-heading">Ergebnis eintragen</h3>
               <button onClick={() => setScoreModal(null)} className="hover:text-[var(--tcw-green-light)]"><X size={20}/></button>
            </div>
            <form onSubmit={(e) => {
               e.preventDefault(); const fd = new FormData(e.target);
               const s1 = [parseInt(fd.get('s1_t1')||0), parseInt(fd.get('s1_t2')||0)];
               const s2 = [parseInt(fd.get('s2_t1')||0), parseInt(fd.get('s2_t2')||0)];
               const tb = fd.get('tb_t1') ? [parseInt(fd.get('tb_t1')||0), parseInt(fd.get('tb_t2')||0)] : null;
               const winnerId = (s1[0]>s1[1]&&s2[0]>s2[1]) ? scoreModal.team1.id : ((s1[1]>s1[0]&&s2[1]>s2[0]) ? scoreModal.team2.id : (tb && tb[0]>tb[1] ? scoreModal.team1.id : scoreModal.team2.id));
               setMatches(prev => prev.map(m => m.id === scoreModal.id ? { ...m, score: { s1, s2, tb }, winnerId } : m));
               setScoreModal(null);
            }} className="p-6">
              <div className="flex justify-between items-end mb-4 font-bold text-sm text-[var(--contrast-3)] border-b border-[var(--base)] pb-2 uppercase tracking-wider">
                <div className="w-1/2">Teams</div><div className="w-12 text-center">S1</div><div className="w-12 text-center">S2</div><div className="w-12 text-center text-[var(--tcw-orange)]">TB</div>
              </div>
              <div className="flex justify-between items-center mb-5">
                <div className="w-1/2 font-bold truncate pr-4">{scoreModal.team1?.name}</div>
                <input name="s1_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[0]} className="w-12 p-2 border border-[var(--contrast-3)] rounded-md text-center font-bold outline-none focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] bg-white" required />
                <input name="s2_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[0]} className="w-12 p-2 border border-[var(--contrast-3)] rounded-md text-center font-bold outline-none focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] bg-white" required />
                <input name="tb_t1" type="number" min="0" max="30" defaultValue={scoreModal.score?.tb?.[0]} className="w-12 p-2 border border-[var(--tcw-orange)]/50 rounded-md text-center font-bold text-[var(--tcw-orange)] outline-none focus:border-[var(--tcw-orange)] focus:ring-1 focus:ring-[var(--tcw-orange)] bg-[var(--tcw-orange)]/5" />
              </div>
              <div className="flex justify-between items-center mb-8">
                <div className="w-1/2 font-bold truncate pr-4">{scoreModal.team2?.name}</div>
                <input name="s1_t2" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[1]} className="w-12 p-2 border border-[var(--contrast-3)] rounded-md text-center font-bold outline-none focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] bg-white" required />
                <input name="s2_t2" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[1]} className="w-12 p-2 border border-[var(--contrast-3)] rounded-md text-center font-bold outline-none focus:border-[var(--tcw-green)] focus:ring-1 focus:ring-[var(--tcw-green)] bg-white" required />
                <input name="tb_t2" type="number" min="0" max="30" defaultValue={scoreModal.score?.tb?.[1]} className="w-12 p-2 border border-[var(--tcw-orange)]/50 rounded-md text-center font-bold text-[var(--tcw-orange)] outline-none focus:border-[var(--tcw-orange)] focus:ring-1 focus:ring-[var(--tcw-orange)] bg-[var(--tcw-orange)]/5" />
              </div>
              <button type="submit" className="w-full bg-[var(--tcw-green)] text-white py-3 rounded-md font-bold hover:bg-[var(--tcw-green-dark)] transition shadow-sm">Ergebnis Speichern</button>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE PROMPT MODAL */}
      {schedulePrompt && (
        <div className="fixed inset-0 bg-[var(--contrast)]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--base-3)] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-[var(--tcw-green)] p-5 flex justify-between items-center text-white"><h3 className="font-bold font-heading">Spielplan-Methode wählen</h3><button onClick={() => setSchedulePrompt(false)}><X size={20}/></button></div>
            <div className="p-6">
              <button onClick={() => generateSchedule('traditional')} className="w-full bg-[var(--base-2)] border border-[var(--base)] p-5 rounded-md font-bold hover:bg-[var(--base)] mb-4 text-left transition shadow-sm text-[var(--contrast)]">1. Klassische Zeitfenster (Fest)</button>
              <button onClick={() => generateSchedule('courtPerGroup')} className="w-full bg-[var(--tcw-green)]/10 border border-[var(--tcw-green)]/30 text-[var(--tcw-green-dark)] p-5 rounded-md font-bold hover:bg-[var(--tcw-green)]/20 text-left transition shadow-sm">2. Flexible Zeiten (Plätze an Gruppen zuweisen)</button>
            </div>
          </div>
        </div>
      )}

      {/* KO PROMPT MODAL */}
      {koPrompt && (
        <div className="fixed inset-0 bg-[var(--contrast)]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--base-3)] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-[var(--tcw-orange)] p-5 flex justify-between items-center text-white"><h3 className="font-bold flex items-center font-heading"><AlertTriangle size={20} className="mr-2"/> Auffüllen für 8-Team-Baum</h3><button onClick={() => setKoPrompt(false)}><X size={20}/></button></div>
            <div className="p-6 flex flex-col space-y-4">
               <button onClick={() => generateKO(2, false)} className="bg-[var(--base-2)] border border-[var(--base)] py-4 px-5 rounded-md font-bold hover:bg-[var(--base)] text-left flex justify-between items-center shadow-sm transition text-[var(--contrast)]"><span>1. Plätze leer lassen</span><span className="text-xs bg-[var(--contrast-3)] px-2 py-1 rounded-md text-white">Freilose</span></button>
               <button onClick={() => generateKO(2, true)} className="bg-[var(--tcw-green)]/10 border border-[var(--tcw-green)]/30 text-[var(--tcw-green-dark)] py-4 px-5 rounded-md font-bold hover:bg-[var(--tcw-green)]/20 text-left flex justify-between items-center shadow-sm transition"><span>2. Beste verbleibende Teams</span><span className="text-xs bg-[var(--tcw-green)] text-white px-2 py-1 rounded-md">Wildcards</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}