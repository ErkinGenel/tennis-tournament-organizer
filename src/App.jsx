import { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Users, Calendar, Trash2, Edit, Save, Upload, Monitor, LayoutDashboard, 
  Clock, Smartphone, Play, CheckCircle, ChevronRight, X, Lock, Loader2, FastForward, 
  Edit2, Download, Award, Tv, LogOut, User, AlertTriangle, Shield, PlusCircle, Printer, GitCommit
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

// ==========================================
// 🎨 BRANDING SETTINGS
// ==========================================
const BRAND = {
  logo: "https://tcwannweil.com/wp-content/uploads/Logo-50-Jahre.png", 
  banner: "https://tcwannweil.com/wp-content/uploads/image1000099.jpg?auto=format&fit=crop&w=2000&q=80", 
  name: "TC Wannweil"
};

// --- FIREBASE CONFIGURATION ---
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

// --- Core Constants ---
const COURTS = 6;
const CATEGORIES = { U50: 'Herren unter 50', O50: 'Herren über 50' };
const LEVELS = [3, 2, 1]; 
const MOCK_CLUBS = ['TC Wannweil', 'TC Reutlingen', 'TC Tübingen', 'TC Metzingen', 'TC Pfullingen', 'TV Kirchentellinsfurt'];
const MOCK_FIRST_NAMES = ['Lukas', 'Maximilian', 'Jonas', 'Paul', 'Leon', 'Finn', 'Elias', 'Ben', 'Luis', 'Felix', 'Markus', 'Thomas', 'Michael', 'Andreas', 'Stefan', 'Christian', 'Martin', 'Daniel'];
const MOCK_LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer'];

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
  
  let tb = null; let winnerIdx; 
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

const formatStageGroupName = (stage, rawName) => {
    if (!rawName) return 'Offen';
    if (stage === 'Placement') {
        if (rawName.includes('Halbfinale') || rawName.includes('5-8')) return 'Platzierungsspiel, 5-8';
        return rawName; 
    }
    if (stage === 'Group') return rawName.includes('Gruppe') ? rawName : 'Gruppe ' + rawName;
    return rawName;
};

// --- REUSABLE MATCH BOX COMPONENT ---
const MonitorMatchBox = ({ match, title, type = 'normal' }) => {
    let displayTitle = formatStageGroupName(match ? match.stage : null, title || (match ? match.groupName : 'Offen'));
    
    let borderColor = 'border-[#444444]';
    let headerBg = 'bg-[#333333] text-gray-200 border-[#444444]';
    let contentBg = 'bg-[#222222]';
    let scale = 'scale-100';
    
    if (type === 'sf') { scale = 'scale-105'; }
    else if (type === 'final') {
        borderColor = 'border-[#E3000F] border-2';
        headerBg = 'bg-[#E3000F] text-white border-[#C2000D]';
        scale = 'scale-110 shadow-2xl';
    } else if (type === 'place_sf') {
        contentBg = 'bg-[#222222] opacity-90';
    } else if (type === 'place_3') {
        borderColor = 'border-gray-500 border-2';
        headerBg = 'bg-gray-600 text-white border-gray-700';
        scale = 'scale-105 shadow-xl';
    }

    if (!match) return <div className={`w-64 h-24 border-2 border-dashed border-[#555555] rounded-lg bg-[#222222]/50 flex flex-col items-center justify-center text-gray-500 font-bold m-2 break-inside-avoid ${scale}`}><div className="heading-font text-xs uppercase tracking-widest my-2 opacity-50">{displayTitle}</div><div className="heading-font text-lg mb-4">Offen</div></div>;

    const t1IsBye = match.team1?.isBye;
    const t2IsBye = match.team2?.isBye;
    if (t1IsBye && t2IsBye) return null;

    return (
        <div className={`w-72 border ${borderColor} rounded-lg shadow-xl overflow-hidden m-2 break-inside-avoid ${scale} transition-transform`}>
            <div className={`heading-font ${headerBg} text-xs text-center py-2 font-bold uppercase tracking-widest border-b`}>{displayTitle}</div>
            
            <div className={`p-3 flex justify-between text-lg border-b border-[#444444] ${match.winnerId === match.team1?.id ? 'bg-[#333333] text-white font-bold' : `text-gray-300 ${contentBg}`}`}>
                <span className={`truncate pr-2 ${t1IsBye ? 'text-[#E3000F] italic font-bold text-sm' : ''}`}>{t1IsBye ? 'Freilos' : (match.team1?.name || 'Offen')}</span>
                {!t1IsBye && !t2IsBye && <span className="text-white font-bold tracking-widest">{match.score?.s1[0]} {match.score?.s2[0]}</span>}
            </div>
            
            <div className={`p-3 flex justify-between text-lg ${match.winnerId === match.team2?.id ? 'bg-[#333333] text-white font-bold' : `text-gray-300 ${contentBg}`}`}>
                <span className={`truncate pr-2 ${t2IsBye ? 'text-[#E3000F] italic font-bold text-sm' : ''}`}>{t2IsBye ? 'Freilos' : (match.team2?.name || 'Offen')}</span>
                {!t1IsBye && !t2IsBye && <span className="text-white font-bold tracking-widest">{match.score?.s1[1]} {match.score?.s2[1]}</span>}
            </div>
        </div>
    );
};

// --- Main Application Component ---
export default function App() {
  // --- 1. BASIC STATE ---
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

  // --- 2. DERIVED STATE ---
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

  const finalRankings = useMemo(() => {
    const ranks = { U50: [], O50: [] };
    if (!brackets.U50 && !brackets.O50) return ranks;

    ['U50', 'O50'].forEach(cat => {
      const b = brackets[cat];
      if (!b) return;
      const getWinner = (id) => { const m = matches.find(x => x.id === id); return m?.winnerId ? (m.winnerId === m.team1.id ? m.team1 : m.team2) : null; };
      const getLoser = (id) => { const m = matches.find(x => x.id === id); return m?.winnerId ? (m.winnerId === m.team1.id ? m.team2 : m.team1) : null; };

      const top8 = [
        getWinner(`final_${cat}`), getLoser(`final_${cat}`),
        getWinner(`place_3_${cat}`), getLoser(`place_3_${cat}`),
        getWinner(`place_5_${cat}`), getLoser(`place_5_${cat}`),
        getWinner(`place_7_${cat}`), getLoser(`place_7_${cat}`)
      ];

      top8.forEach((team, idx) => {
         if (team && !team.isBye) ranks[cat].push({ rank: idx + 1, team });
      });

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

  // --- 3. FIREBASE & APP LOGIC EFFECTS ---
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
        const liveData = docSnap.data();
        if (liveData.teams) setTeams(liveData.teams);
        if (liveData.groups) setGroups(liveData.groups);
        if (liveData.matches) setMatches(liveData.matches);
        if (liveData.brackets) setBrackets(liveData.brackets);
        if (liveData.day1Start) setDay1Start(liveData.day1Start);
        if (liveData.day2Start) setDay2Start(liveData.day2Start);
        if (liveData.tournamentDays) setTournamentDays(liveData.tournamentDays);
        if (liveData.isolateGrandFinals !== undefined) setIsolateGrandFinals(liveData.isolateGrandFinals);
      }
    });
    return () => unsubscribe();
  }, [user, appId, appMode]);

  useEffect(() => {
    const syncToCloud = async () => {
      if (appMode === 'organizer' && user) {
        try {
          const tournamentDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournament', 'mainState');
          await setDoc(tournamentDocRef, { teams, groups, matches, brackets, day1Start, day2Start, tournamentDays, isolateGrandFinals, lastUpdated: new Date().toISOString() });
        } catch (error) { console.error("Failed to push updates to live server:", error); }
      }
    };
    const timeoutId = setTimeout(syncToCloud, 800);
    return () => clearTimeout(timeoutId);
  }, [teams, groups, matches, brackets, day1Start, day2Start, tournamentDays, isolateGrandFinals, appMode, user, appId]);

  // --- 4. TV MONITOR LOGIC ---
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
            const grps = Object.entries(groups[cat] || {});
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
            const last10 = scheduleMatches.slice(-10);
            newSlides.push({ type: 'schedule', title: 'Letzte Ergebnisse', data: last10, pageInfo: '' });
        } else if (displayMatches.length > 0) {
            for(let i=0; i<displayMatches.length; i+=matchChunkSize) {
                newSlides.push({ type: 'schedule', title: 'Spielplan (Aktuell & Kommend)', data: displayMatches.slice(i, i+matchChunkSize), pageInfo: displayMatches.length>matchChunkSize ? `(Teil ${Math.floor(i/matchChunkSize)+1}/${Math.ceil(displayMatches.length/matchChunkSize)})` : '' });
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

    if (isEnded) {
        ['U50', 'O50'].forEach(cat => {
            const ranks = finalRankings[cat] || [];
            if (ranks.length > 0) {
                for(let i=0; i<ranks.length; i+=12) {
                    newSlides.push({ type: 'rankings', cat, title: `Abschlussplatzierungen: ${CATEGORIES[cat]}`, data: ranks.slice(i, i+12), pageInfo: ranks.length>12 ? `(Plätze ${i+1}-${Math.min(i+12, ranks.length)})` : '' });
                }
            }
        });
    }

    if (newSlides.length === 0) newSlides.push({ type: 'idle', title: 'Willkommen beim Turnier' });

    setMonitorSlides(newSlides);
    if (monitorSlideIdx >= newSlides.length) setMonitorSlideIdx(0);
  }, [appMode, matches, groups, brackets, finalRankings]);

  useEffect(() => {
    if (appMode === 'monitor' && monitorSlides.length > 0) {
      const rotateInt = setInterval(() => {
        setMonitorSlideIdx(prev => (prev + 1) % monitorSlides.length);
      }, 15000); 
      return () => clearInterval(rotateInt);
    }
  }, [appMode, monitorSlides]);

  // --- 5. FUNCTIONS & HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'wannweil') {
      sessionStorage.setItem('tennis_auth', 'true');
      setAppMode('organizer');
      setAuthError('');
    } else {
      const foundTeam = teams.find(t => t.pin === passwordInput);
      if (foundTeam) {
        setAppMode('player');
        setLoggedInTeamId(foundTeam.id);
        setAuthError('');
      } else {
        setAuthError('Falsches Passwort oder falsche Team-PIN.');
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('tennis_auth');
    setPasswordInput('');
    setAppMode('login');
  };

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
      p1Club: team.p1Club || team.clubs[0] || '', p2Club: team.p2Club || team.clubs[1] || team.clubs[0] || '',
      level: team.level.toString(), category: team.category
    });
    setEditingTeam(team);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setTeams(teams.filter(t => t.id !== id));
    setGroups({ U50: {}, O50: {} });
    setMatches([]);
    setBrackets({ U50: null, O50: null });
    setConfirmDelete(null);
  };

  const loadMockData = () => {
    const mockTeams = [];
    ['U50', 'O50'].forEach(category => {
      for (let i = 0; i < 12; i++) {
        const c1 = getRandom(MOCK_CLUBS);
        const c2 = Math.random() > 0.5 ? c1 : getRandom(MOCK_CLUBS);
        const p1 = `${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)}`;
        const p2 = `${getRandom(MOCK_FIRST_NAMES)} ${getRandom(MOCK_LAST_NAMES)}`;
        mockTeams.push({ 
           id: generateId(), name: `${p1} / ${p2}`, 
           p1Club: c1, p2Club: c2, clubs: [c1, c2],
           level: getRandom(LEVELS), category, pin: generatePin()
        });
      }
    });
    setTeams(mockTeams);
    setGroups({ U50: {}, O50: {} });
    setMatches([]);
    setBrackets({ U50: null, O50: null });
  };

  const handleExportTournament = () => {
    const dataStr = JSON.stringify({ teams, groups, matches, brackets, day1Start, day2Start, tournamentDays, isolateGrandFinals });
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tc_wannweil_turnier_${new Date().toISOString().split('T')[0]}.json`;
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
        if (Array.isArray(data)) setTeams(data);
        else {
           if (data.teams) setTeams(data.teams);
           if (data.groups) setGroups(data.groups);
           if (data.matches) setMatches(data.matches);
           if (data.brackets) setBrackets(data.brackets);
           if (data.day1Start) setDay1Start(data.day1Start);
           if (data.day2Start) setDay2Start(data.day2Start);
           if (data.tournamentDays) setTournamentDays(data.tournamentDays);
           if (data.isolateGrandFinals !== undefined) setIsolateGrandFinals(data.isolateGrandFinals);
           if (data.matches && data.matches.length > 0) setActiveTab('schedule');
        }
        setAuthError('');
      } catch (err) {
        setAuthError('Fehler: Ungültiges JSON-Dateiformat.');
        setTimeout(() => setAuthError(''), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
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
        
        const team = unassigned.splice(selectedIdx, 1)[0];
        groupArrays[gIndex].push(team);
        
        gIndex += dir;
        if (gIndex >= numGroups || gIndex < 0) { dir *= -1; gIndex += dir; }
      }
      groupArrays.forEach((arr, i) => newGroups[cat][`Gruppe ${String.fromCharCode(65 + i)}`] = arr);
    });
    setGroups(newGroups);
    setMatches([]);
  };

  const generateSchedule = (mode = 'traditional') => {
    let newMatches = [];
    
    if (mode === 'traditional') {
      const timeSlots = generateTimeSlots(day1Start, 8);
      ['U50', 'O50'].forEach(cat => {
        if (!groups[cat]) return;
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
    } else if (mode === 'courtPerGroup') {
      let gIdx = 0;
      ['U50', 'O50'].forEach(cat => {
        if (!groups[cat]) return;
        Object.entries(groups[cat]).forEach(([groupName, groupTeams]) => {
          const courtNum = (gIdx % COURTS) + 1;
          
          let pairs = [];
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              pairs.push({ t1: groupTeams[i], t2: groupTeams[j] });
            }
          }
          
          let orderedPairs = [];
          let lastPlayed = {};
          
          while(pairs.length > 0) {
            let bestIdx = 0;
            let bestScore = -1;
            
            for(let i=0; i<pairs.length; i++) {
               let dist1 = lastPlayed[pairs[i].t1.id] !== undefined ? orderedPairs.length - lastPlayed[pairs[i].t1.id] : 999;
               let dist2 = lastPlayed[pairs[i].t2.id] !== undefined ? orderedPairs.length - lastPlayed[pairs[i].t2.id] : 999;
               let score = Math.min(dist1, dist2);
               
               if(score > bestScore) {
                  bestScore = score;
                  bestIdx = i;
               }
            }
            
            let selected = pairs.splice(bestIdx, 1)[0];
            orderedPairs.push(selected);
            lastPlayed[selected.t1.id] = orderedPairs.length - 1;
            lastPlayed[selected.t2.id] = orderedPairs.length - 1;
          }

          orderedPairs.forEach((p, idx) => {
            newMatches.push({ 
              id: generateId(), day: 1, time: 'Flexibel', court: courtNum, 
              category: cat, stage: 'Group', groupName, 
              team1: p.t1, team2: p.t2, score: null, winnerId: null,
              matchOrder: idx + 1
            });
          });
          
          gIdx++;
        });
      });
    }

    if (tournamentDays === 1) {
      if (mode === 'traditional') {
        const usedTimes = newMatches.map(m => m.time).filter(t => t);
        if (usedTimes.length > 0) {
           const latestTime = usedTimes.sort().reverse()[0];
           const nextSlot = generateTimeSlots(latestTime, 2)[1];
           setDay2Start(nextSlot);
        }
      } else if (mode === 'courtPerGroup') {
        let maxTeams = 0;
        ['U50', 'O50'].forEach(cat => {
          if (groups[cat]) {
            Object.values(groups[cat]).forEach(gTeams => {
              if (gTeams.length > maxTeams) maxTeams = gTeams.length;
            });
          }
        });
        const maxMatches = (maxTeams * (maxTeams - 1)) / 2;
        const totalMinutes = maxMatches * 90;
        let [hours, minutes] = day1Start.split(':').map(Number);
        hours += Math.floor(totalMinutes / 60);
        minutes += totalMinutes % 60;
        if (minutes >= 60) { hours += Math.floor(minutes / 60); minutes %= 60; }
        setDay2Start(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      }
    }

    const koMatches = matches.filter(m => m.stage !== 'Group');
    setMatches([...newMatches, ...koMatches]);
    setSchedulePrompt(false);
    if (simState === 'idle') setActiveTab('schedule');
  };

  const fillMissingScores = (stageFilter = '', groupFilter = '') => {
    setMatches(prev => prev.map(m => {
      const isStageMatch = stageFilter === '' || m.stage === stageFilter || (stageFilter === 'Placement' && m.stage === 'Placement');
      const isGroupMatch = groupFilter === '' || m.groupName.includes(groupFilter);

      if (m.score || !m.team1 || !m.team2 || m.team1.isBye || m.team2.isBye || !isStageMatch || !isGroupMatch) return m;
      
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
    const numSlots = isolateGrandFinals ? 4 : 3;
    const day2Slots = generateTimeSlots(day2Start, numSlots);
    const timeQF = day2Slots[0]; 
    const timeSF = day2Slots[1]; 
    const timePlacements = day2Slots[2];
    const timeGrandFinal = isolateGrandFinals ? day2Slots[3] : day2Slots[2];

    const getAvailableCourt = (time) => {
      const courtsInUse = newMatches.filter(m => m.day === targetDay && m.time === time).map(m => m.court);
      for (let i = 1; i <= COURTS; i++) if (!courtsInUse.includes(i)) return i;
      return Math.floor(Math.random() * COURTS) + 1;
    };

    ['U50', 'O50'].forEach(cat => {
      if (!standings[cat] || Object.keys(standings[cat]).length === 0) return;

      let qualifiers = [];
      let remainingTeams = []; 

      Object.values(standings[cat]).forEach(groupStandings => {
        groupStandings.forEach((team, i) => {
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
         
         const needed = 8 - qualifiers.length;
         const wildcards = remainingTeams.slice(0, needed).map(t => ({ ...t, seedType: `Wildcard` }));
         qualifiers = [...qualifiers, ...wildcards];
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
        { id: `final_${cat}`, title: 'Finale', team1: null, team2: null, time: timeGrandFinal },
        { id: `place_3_${cat}`, title: 'Spiel um Platz 3', team1: null, team2: null, time: timePlacements },
        { id: `place_5_${cat}`, title: 'Spiel um Platz 5', team1: null, team2: null, time: timePlacements },
        { id: `place_7_${cat}`, title: 'Spiel um Platz 7', team1: null, team2: null, time: timePlacements }
      ];

      qfNodes.forEach(node => {
        if (!node.team1.isBye && !node.team2.isBye) {
           newMatches.push({ id: node.id, category: cat, stage: 'KO', groupName: 'Viertelfinale', team1: node.team1, team2: node.team2, score: null, winnerId: null, nextMatchId: node.next, nextLoserId: node.nextLoser, day: targetDay, time: timeQF, court: getAvailableCourt(timeQF) });
        }
      });

      [...sfNodes, ...pSfNodes].forEach(node => {
         newMatches.push({ id: node.id, category: cat, stage: node.id.includes('place') ? 'Placement' : 'KO', groupName: node.title, team1: null, team2: null, score: null, winnerId: null, nextMatchId: node.next, nextLoserId: node.nextLoser, day: targetDay, time: timeSF, court: getAvailableCourt(timeSF) });
      });

      finalNodes.forEach(node => {
         newMatches.push({ id: node.id, category: cat, stage: node.id.includes('place') ? 'Placement' : 'KO', groupName: node.title, team1: null, team2: null, score: null, winnerId: null, day: targetDay, time: node.time, court: getAvailableCourt(node.time) });
      });

      newBrackets[cat] = { qf: qfNodes, sf: sfNodes, pSf: pSfNodes, finals: finalNodes };
    });

    setBrackets(newBrackets);
    setMatches(newMatches);
    setKoPrompt(false);
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
       pushToNode(m.nextMatchId, winner);
       pushToNode(m.nextLoserId, loser);
    });

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
        case 'schedule': generateSchedule('traditional'); setActiveTab('schedule'); setSimState('group_scores'); break;
        case 'group_scores': fillMissingScores('Group'); setActiveTab('groups'); setSimState('ko'); break;
        case 'ko': 
          generateKO(2, true); 
          setActiveTab('bracket'); 
          setSimState('ko_qf_scores'); 
          break;
        case 'ko_qf_scores': fillMissingScores('KO', 'Viertelfinale'); setSimState('ko_sf_scores'); break;
        case 'ko_sf_scores': fillMissingScores('KO', 'Halbfinale'); fillMissingScores('Placement', 'Platzierungsspiel, 5-8'); setSimState('ko_final_scores'); break;
        case 'ko_final_scores': fillMissingScores('KO', 'Finale'); fillMissingScores('Placement', 'Spiel um Platz'); setSimState('idle'); break;
        default: setSimState('idle');
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [simState]);

  const renderScore = (score) => {
    if (!score) return <span className="text-gray-400">vs</span>;
    let text = `${score.s1[0]}:${score.s1[1]} | ${score.s2[0]}:${score.s2[1]}`;
    if (score.tb && (score.tb[0] > 0 || score.tb[1] > 0)) text += ` | [${score.tb[0]}:${score.tb[1]}]`;
    return <span className="font-semibold text-gray-800">{text}</span>;
  };

  const groupMatches = matches.filter(m => m.stage === 'Group');
  const unplayedGroupCount = groupMatches.filter(m => !m.winnerId).length;
  const canGenerateKO = matches.length > 0 && groupMatches.length > 0 && unplayedGroupCount === 0;

  const getMonitorMatchData = (id) => matches.find(m => m.id === id);

  // --- UI RENDER: LOGIN & LAUNCH SCREEN ---
  if (appMode === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#F5F7FA]">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&family=Open+Sans:wght@400;600;700&display=swap');
          body, button, input, select, textarea { font-family: 'Open Sans', sans-serif; }
          .heading-font, h1, h2, h3, h4, h5, h6, th, .uppercase, .font-extrabold { font-family: 'Montserrat', sans-serif; }
        `}</style>
        <div className="absolute inset-0 z-0">
          <img src={BRAND.banner} alt="Background" className="w-full h-full object-cover opacity-10 grayscale" />
        </div>
        
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          <div className="h-28 w-28 rounded-full flex items-center justify-center p-2 shadow-lg border-[3px] mb-6">
             <img src={BRAND.logo} alt="Logo" className="w-full h-full rounded-full object-contain" />
          </div>
          <div className="bg-white p-8 rounded-lg shadow-xl w-full border-t-4 border-[#E3000F] mb-6 relative overflow-hidden">
            {authError && <div className="absolute top-0 left-0 w-full bg-[#E3000F] text-white text-xs font-bold text-center py-2 animate-in slide-in-from-top heading-font tracking-wider">{authError}</div>}
            <h2 className="heading-font text-2xl font-extrabold text-center text-[#222222] mt-2 mb-2">{BRAND.name} Portal</h2>
            <p className="text-center text-gray-500 text-sm mb-6 font-medium">Veranstalter-Passwort oder Team-PIN eingeben</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md text-center tracking-widest font-bold focus:border-[#E3000F] focus:ring-1 focus:ring-[#E3000F] transition outline-none" placeholder="Passwort oder PIN" required />
              <button type="submit" className="heading-font uppercase tracking-wider w-full bg-[#E3000F] text-white p-3 rounded-md font-bold hover:bg-[#C2000D] shadow-md transition">Anmelden</button>
            </form>
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 mb-2 font-medium">Haben Sie eine Offline-Turnierdatei?</p>
              <label className="heading-font text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-md cursor-pointer transition font-bold uppercase tracking-wider">
                 Datei laden
                 <input type="file" accept=".json" className="hidden" onChange={handleImportTournament} />
              </label>
            </div>
          </div>

          <div className="bg-[#222222] p-8 rounded-lg shadow-xl w-full border-t-4 border-[#444444] text-center">
             <Tv className="h-10 w-10 text-[#E3000F] mx-auto mb-4" />
             <h3 className="heading-font font-bold text-white text-xl mb-2">TV-Monitor Anzeige</h3>
             <p className="text-sm text-gray-400 mb-6 font-medium">Starten Sie das Live-Turnier-Dashboard für große Bildschirme.</p>
             <button onClick={() => setAppMode('monitor')} className="heading-font uppercase tracking-wider w-full bg-[#333333] text-white p-3 rounded-md font-bold hover:bg-[#444444] shadow-md flex items-center justify-center transition">
               <Monitor size={20} className="mr-2" /> Monitor starten
             </button>
          </div>
        </div>
      </div>
    );
  }

  // --- UI RENDER: MOBILE PLAYER PORTAL ---
  if (appMode === 'player') {
    const myTeam = teams.find(t => t.id === loggedInTeamId);
    if (!myTeam) { setAppMode('login'); return null; }
    let myGroupTeams = []; let myGroupName = 'Offen';
    if (groups[myTeam.category]) {
      Object.entries(groups[myTeam.category]).forEach(([name, gTeams]) => {
        if (gTeams.find(t => t.id === myTeam.id)) { myGroupTeams = standings[myTeam.category][name] || gTeams; myGroupName = name; }
      });
    }
    const myMatches = matches.filter(m => m.team1?.id === myTeam.id || m.team2?.id === myTeam.id);
    const scheduledMatches = myMatches.filter(m => m.time !== null && !m.team1?.isBye && !m.team2?.isBye).sort((a,b) => {
      if(a.day !== b.day) return a.day - b.day; return a.time.localeCompare(b.time);
    });

    return (
      <div className="bg-[#F5F7FA] min-h-screen flex justify-center">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&family=Open+Sans:wght@400;600;700&display=swap');
          body, button, input, select, textarea { font-family: 'Open Sans', sans-serif; }
          .heading-font, h1, h2, h3, h4, h5, h6, th, .uppercase, .font-extrabold { font-family: 'Montserrat', sans-serif; }
        `}</style>
        <div className="w-full max-w-[400px] bg-white min-h-screen flex flex-col shadow-2xl relative">
          
          <header className="relative bg-white text-[#222222] pt-10 pb-6 px-5 border-b-[4px] border-[#E3000F] shadow-sm z-10 overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img src={BRAND.banner} alt="Banner" className="w-full h-full object-cover opacity-5 grayscale" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="h-14 w-14 rounded-full flex items-center justify-center p-0.5 shadow-sm border-2">
                   <img src={BRAND.logo} alt="Logo" className="w-full h-full rounded-full object-contain" />
                </div>
                <button onClick={handleLogout} className="text-gray-400 hover:text-[#E3000F] p-2 bg-gray-50 rounded-full transition">
                  <LogOut size={20} />
                </button>
              </div>
              <h1 className="heading-font text-2xl font-black leading-tight mb-1">{myTeam.name}</h1>
              <div className="flex items-center space-x-2 text-[#E3000F] text-sm font-bold">
                 <span>{CATEGORIES[myTeam.category]}</span>
                 <span className="text-gray-300">•</span>
                 <span className="truncate text-gray-600">{myTeam.clubs.join(' / ')}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-5 pb-24 bg-[#F5F7FA]">
            {playerTab === 'matches' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="heading-font text-lg font-extrabold text-[#222222] flex items-center uppercase"><Calendar className="mr-2 text-[#E3000F]" size={20}/> Mein Spielplan</h2>
                {scheduledMatches.length === 0 ? (
                  <div className="bg-white p-6 rounded-lg text-center shadow-sm border border-gray-200 text-gray-500 font-medium">Noch keine Spiele geplant.</div>
                ) : (
                  scheduledMatches.map(m => {
                    const isWinner = m.winnerId === myTeam.id; const isLoser = m.winnerId && m.winnerId !== myTeam.id;
                    const opp = m.team1.id === myTeam.id ? m.team2 : m.team1;
                    return (
                      <div key={m.id} className={`bg-white rounded-lg p-4 shadow-sm border-l-4 ${isWinner ? 'border-l-green-600' : isLoser ? 'border-l-gray-400' : 'border-l-[#E3000F]'}`}>
                        <div className="heading-font flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
                          <span>Tag {m.day} • {m.time} • Platz {m.court}</span>
                          <span className="text-[#E3000F] bg-red-50 px-2 py-0.5 rounded-sm">{formatStageGroupName(m.stage, m.groupName)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Gegner</div>
                            <div className="font-bold text-[#222222] text-sm">{opp.name}</div>
                          </div>
                          <div className="text-right pl-4">
                            {m.score ? (
                               <div className={`font-black text-lg ${isWinner ? 'text-green-600' : 'text-gray-500'}`}>
                                  {m.score.s1[0]}:{m.score.s1[1]} <br/> {m.score.s2[0]}:{m.score.s2[1]}
                                  {m.score.tb && <span><br/>[{m.score.tb[0]}:{m.score.tb[1]}]</span>}
                               </div>
                            ) : (<span className="heading-font text-gray-300 font-bold text-sm uppercase">VS</span>)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {playerTab === 'group' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="heading-font text-lg font-extrabold text-[#222222] flex items-center uppercase"><Shield className="mr-2 text-[#E3000F]" size={20}/> {myGroupName}</h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-500 text-xs uppercase heading-font">
                       <tr><th className="p-3">Pos</th><th className="p-3">Team</th><th className="p-3 text-center">S-N</th></tr>
                     </thead>
                     <tbody>
                       {myGroupTeams.map((t, idx) => (
                         <tr key={t.id} className={`border-b border-gray-100 last:border-0 ${t.id === myTeam.id ? 'bg-red-50/50' : ''}`}>
                           <td className="p-3 font-bold text-gray-400">{idx+1}</td>
                           <td className={`p-3 truncate max-w-[120px] ${t.id === myTeam.id ? 'font-bold text-[#E3000F]' : 'text-[#222222] font-medium'}`}>{t.name}</td>
                           <td className="p-3 text-center font-bold text-[#222222]">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              </div>
            )}

            {playerTab === 'rankings' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="heading-font text-lg font-extrabold text-[#222222] flex items-center uppercase"><Award className="mr-2 text-yellow-500" size={20}/> Rangliste</h2>
                {(!finalRankings[myTeam.category] || finalRankings[myTeam.category].length === 0) ? (
                   <div className="bg-white p-6 rounded-lg text-center shadow-sm border border-gray-200 text-gray-500 font-medium">Die Rangliste wird nach Beginn der K.O.-Phase angezeigt.</div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {finalRankings[myTeam.category].map((item, idx) => (
                       <div key={item.team.id} className={`flex items-center p-3 border-b border-gray-100 last:border-0 ${item.team.id === myTeam.id ? 'bg-red-50 border-l-4 border-l-[#E3000F]' : ''}`}>
                         <div className="w-8 text-center font-extrabold text-gray-400">{idx===0?'🏆':item.rank}</div>
                         <div className={`flex-1 pl-3 truncate ${item.team.id === myTeam.id ? 'font-bold text-[#E3000F]' : 'text-[#222222] font-medium'}`}>{item.team.name}</div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>

          <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
             <button onClick={() => setPlayerTab('matches')} className={`flex flex-col items-center p-2 rounded-md w-20 transition-colors ${playerTab === 'matches' ? 'text-[#E3000F] bg-red-50' : 'text-gray-400 hover:text-[#222222]'}`}>
               <Calendar size={20} className="mb-1" /> <span className="heading-font text-[10px] font-bold uppercase tracking-wider">Spiele</span>
             </button>
             <button onClick={() => setPlayerTab('group')} className={`flex flex-col items-center p-2 rounded-md w-20 transition-colors ${playerTab === 'group' ? 'text-[#E3000F] bg-red-50' : 'text-gray-400 hover:text-[#222222]'}`}>
               <Shield size={20} className="mb-1" /> <span className="heading-font text-[10px] font-bold uppercase tracking-wider">Gruppe</span>
             </button>
             <button onClick={() => setPlayerTab('rankings')} className={`flex flex-col items-center p-2 rounded-md w-20 transition-colors ${playerTab === 'rankings' ? 'text-[#E3000F] bg-red-50' : 'text-gray-400 hover:text-[#222222]'}`}>
               <Award size={20} className="mb-1" /> <span className="heading-font text-[10px] font-bold uppercase tracking-wider">Rangliste</span>
             </button>
          </nav>
        </div>
      </div>
    );
  }

  // --- UI RENDER: TV MONITOR MODE ---
  if (appMode === 'monitor') {
    const renderMonitorScore = (score) => {
      if (!score) return <span className="text-gray-500 font-normal">vs</span>;
      let text = `${score.s1[0]}:${score.s1[1]}   ${score.s2[0]}:${score.s2[1]}`;
      if (score.tb && (score.tb[0] > 0 || score.tb[1] > 0)) text += `   [${score.tb[0]}:${score.tb[1]}]`;
      return <span className="font-bold text-white">{text}</span>;
    };

    const slide = monitorSlides[monitorSlideIdx] || { type: 'loading', title: 'Lade Daten...' };

    return (
      <div className="h-screen w-screen overflow-hidden bg-[#1a1a1a] text-gray-100 font-sans p-6 flex flex-col">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&family=Open+Sans:wght@400;600;700&display=swap');
          body, button, input, select, textarea { font-family: 'Open Sans', sans-serif; }
          .heading-font, h1, h2, h3, h4, h5, h6, th, .uppercase, .font-extrabold { font-family: 'Montserrat', sans-serif; }
        `}</style>
        <header className="relative flex justify-between items-center mb-6 overflow-hidden rounded-lg shadow-2xl border border-[#333333] shrink-0 bg-[#222222]">
          <div className="relative z-10 flex w-full justify-between items-center p-5">
              <div className="flex items-center space-x-6">
                <div className="h-20 w-20 rounded-full flex items-center justify-center p-1 shadow-lg border-[3px]">
                   <img src={BRAND.logo} alt="Logo" className="w-full h-full rounded-full object-contain" />
                </div>
                <div>
                  <h1 className="heading-font text-5xl font-black tracking-tight text-white uppercase">{BRAND.name}</h1>
                  <div className="heading-font text-2xl font-bold text-[#E3000F] uppercase tracking-widest mt-2 flex items-center">
                    {slide.title} <span className="text-gray-500 ml-3 text-lg">{slide.pageInfo}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <button onClick={handleLogout} className="heading-font uppercase tracking-wider flex items-center space-x-2 text-gray-400 hover:text-white bg-[#333333] hover:bg-[#444444] px-4 py-2 rounded-md transition border border-[#444444] text-lg group">
                  <Lock size={20} className="group-hover:text-[#E3000F] transition-colors" /> <span>Veranstalter</span>
                </button>
                <div className="heading-font text-4xl font-bold text-gray-200 flex items-center bg-[#333333] px-6 py-3 rounded-md shadow-inner border border-[#444444] min-w-[160px] justify-center tracking-wider">
                  {currentTime}
                </div>
              </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {slide.type === 'schedule' && (
            <div className="grid grid-cols-2 gap-6 h-full content-start">
              <div className="flex flex-col space-y-4">
                 {(slide.data || []).slice(0, 5).map(m => (
                    <div key={m.id} className="bg-[#222222] rounded-lg overflow-hidden shadow-lg border border-[#333333] p-4">
                       <div className="heading-font text-gray-400 font-bold mb-3 flex justify-between text-lg border-b border-[#333333] pb-2 uppercase tracking-wider">
                          <span className={`font-bold ${m.time === 'Flexibel' ? 'text-gray-300 text-sm tracking-widest' : 'text-[#E3000F]'}`}>{m.time} • Platz {m.court}</span>
                          <span className="text-gray-500">{CATEGORIES[m.category]?.substring(0,3)} {m.category} • {formatStageGroupName(m.stage, m.groupName)}</span>
                       </div>
                       <div className="flex justify-between items-center text-2xl">
                          <span className={`truncate w-5/12 text-right ${m.winnerId === m.team1?.id ? 'text-white font-extrabold' : 'text-gray-300'}`}>{m.team1?.name || 'Offen'}</span>
                          <span className="w-2/12 text-center bg-[#111111] py-1 rounded-sm font-bold tracking-widest shadow-inner">{renderMonitorScore(m.score)}</span>
                          <span className={`truncate w-5/12 text-left ${m.winnerId === m.team2?.id ? 'text-white font-extrabold' : 'text-gray-300'}`}>{m.team2?.name || 'Offen'}</span>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="flex flex-col space-y-4">
                 {(slide.data || []).slice(5, 10).map(m => (
                    <div key={m.id} className="bg-[#222222] rounded-lg overflow-hidden shadow-lg border border-[#333333] p-4">
                       <div className="heading-font text-gray-400 font-bold mb-3 flex justify-between text-lg border-b border-[#333333] pb-2 uppercase tracking-wider">
                          <span className={`font-bold ${m.time === 'Flexibel' ? 'text-gray-300 text-sm tracking-widest' : 'text-[#E3000F]'}`}>{m.time} • Platz {m.court}</span>
                          <span className="text-gray-500">{CATEGORIES[m.category]?.substring(0,3)} {m.category} • {formatStageGroupName(m.stage, m.groupName)}</span>
                       </div>
                       <div className="flex justify-between items-center text-2xl">
                          <span className={`truncate w-5/12 text-right ${m.winnerId === m.team1?.id ? 'text-white font-extrabold' : 'text-gray-300'}`}>{m.team1?.name || 'Offen'}</span>
                          <span className="w-2/12 text-center bg-[#111111] py-1 rounded-sm font-bold tracking-widest shadow-inner">{renderMonitorScore(m.score)}</span>
                          <span className={`truncate w-5/12 text-left ${m.winnerId === m.team2?.id ? 'text-white font-extrabold' : 'text-gray-300'}`}>{m.team2?.name || 'Offen'}</span>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          )}

          {slide.type === 'groups' && (
             <div className="grid grid-cols-2 gap-6 h-full content-start">
               {(slide.data || []).map(([groupName, groupTeams]) => (
                 <div key={groupName} className="bg-[#222222] rounded-lg border border-[#333333] overflow-hidden shadow-xl">
                   <div className="heading-font bg-[#111111] p-3 text-2xl font-bold text-center text-white tracking-widest uppercase">{groupName}</div>
                   <table className="w-full text-xl">
                     <thead className="bg-[#1a1a1a] text-gray-500 heading-font uppercase text-sm tracking-wider"><tr><th className="p-3 text-left pl-6">Team</th><th className="p-3 text-center">S-N</th><th className="p-3 text-center">Sätze</th></tr></thead>
                     <tbody>
                       {(standings[slide.cat]?.[groupName] || groupTeams).map((t, idx) => (
                         <tr key={t.id} className="border-b border-[#333333] last:border-0">
                           <td className="p-4 pl-6 font-medium text-gray-200 truncate flex items-center"><span className="text-gray-600 w-8 font-bold">{idx+1}</span> {t.name}</td>
                           <td className="p-4 text-center font-bold text-white bg-[#1a1a1a]/50">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                           <td className="p-4 text-center text-gray-400 bg-[#1a1a1a]/50">{t.setsWon !== undefined ? `${t.setsWon}:${t.setsLost}` : '0:0'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ))}
             </div>
          )}

          {slide.type === 'bracket_main' && brackets[slide.cat] && (
             <div className="h-full flex flex-col justify-center pb-8">
                 <div className="flex justify-between items-stretch h-[65vh] px-12 relative">
                     {/* QF */}
                     <div className="flex flex-col justify-around w-[22rem] z-10">
                        {brackets[slide.cat].qf.map((qfRef, i) => (
                           <div key={i} className="relative">
                              <MonitorMatchBox match={getMonitorMatchData(qfRef.id)} title={`Viertelfinale ${i+1}`} />
                              <div className="absolute top-1/2 -right-4 w-4 border-b-2 border-[#444444]"></div>
                           </div>
                        ))}
                     </div>
                     {/* SF */}
                     <div className="flex flex-col justify-around w-[22rem] z-10">
                        {brackets[slide.cat].sf.map((sfRef, i) => (
                           <div key={i} className="relative">
                              <div className="absolute top-[-100px] -left-4 bottom-[50%] border-l-2 border-[#444444] rounded-tl-lg"></div>
                              <div className="absolute bottom-[-100px] -left-4 top-[50%] border-l-2 border-[#444444] rounded-bl-lg"></div>
                              <div className="absolute top-1/2 -left-4 w-4 border-b-2 border-[#444444]"></div>
                              <MonitorMatchBox match={getMonitorMatchData(sfRef.id)} title={sfRef.title} type="sf" />
                              <div className="absolute top-1/2 -right-4 w-4 border-b-2 border-[#444444]"></div>
                           </div>
                        ))}
                     </div>
                     {/* FINAL */}
                     <div className="flex flex-col justify-center w-[25rem] z-10">
                         <div className="relative">
                            <div className="absolute top-[-150px] -left-4 bottom-[50%] border-l-2 border-[#444444] rounded-tl-lg"></div>
                            <div className="absolute bottom-[-150px] -left-4 top-[50%] border-l-2 border-[#444444] rounded-bl-lg"></div>
                            <div className="absolute top-1/2 -left-4 w-4 border-b-2 border-[#444444]"></div>
                            <MonitorMatchBox match={getMonitorMatchData(brackets[slide.cat].finals[0].id)} title="FINALE" type="final" />
                         </div>
                     </div>
                 </div>
             </div>
          )}

          {slide.type === 'bracket_placement' && brackets[slide.cat] && (
             <div className="h-full flex justify-center items-center pb-12">
                 <div className="flex space-x-24 w-full max-w-5xl">
                     {/* Placement Semi-Finals */}
                     <div className="flex flex-col justify-around h-[60vh] flex-1 space-y-12">
                        {brackets[slide.cat].pSf.map((pSfRef, i) => (
                           <MonitorMatchBox key={i} match={getMonitorMatchData(pSfRef.id)} title={pSfRef.title} type="place_sf" />
                        ))}
                     </div>
                     {/* Placement Finals */}
                     <div className="flex flex-col justify-between h-[60vh] flex-1">
                        <MonitorMatchBox match={getMonitorMatchData(brackets[slide.cat].finals[1].id)} title="Spiel um Platz 3" type="place_3" />
                        <div className="mt-6 opacity-90">
                           <MonitorMatchBox match={getMonitorMatchData(brackets[slide.cat].finals[2].id)} title="Spiel um Platz 5" type="place_sf" />
                        </div>
                        <div className="mt-2 opacity-90">
                           <MonitorMatchBox match={getMonitorMatchData(brackets[slide.cat].finals[3].id)} title="Spiel um Platz 7" type="place_sf" />
                        </div>
                     </div>
                 </div>
             </div>
          )}

          {slide.type === 'rankings' && (
             <div className="grid grid-cols-2 gap-8 h-full content-start">
                <div className="flex flex-col space-y-4">
                   {(slide.data || []).slice(0, 6).map(item => (
                      <div key={item.team.id} className={`rounded-lg border flex items-center p-5 shadow-lg ${item.rank === 1 ? 'bg-yellow-500/20 border-yellow-500/50' : item.rank === 2 ? 'bg-gray-400/10 border-gray-500/50' : item.rank === 3 ? 'bg-[#E3000F]/20 border-[#E3000F]/50' : 'bg-[#222222] border-[#333333]'}`}>
                         <div className={`text-4xl font-black w-20 text-center ${item.rank === 1 ? 'text-yellow-400' : item.rank === 2 ? 'text-gray-300' : item.rank === 3 ? 'text-[#E3000F]' : 'text-gray-600'}`}>
                            {item.rank === 1 ? '🏆' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                         </div>
                         <div className="flex-1 text-3xl font-bold text-white truncate pl-4 pr-2">{item.team.name}</div>
                         <div className="text-gray-400 text-xl truncate max-w-[200px]">{item.team.clubs.join(' / ')}</div>
                      </div>
                   ))}
                </div>
                <div className="flex flex-col space-y-4">
                   {(slide.data || []).slice(6, 12).map(item => (
                      <div key={item.team.id} className="bg-[#222222] rounded-lg border border-[#333333] flex items-center p-5 shadow-lg">
                         <div className="text-4xl font-black text-gray-600 w-20 text-center">{item.rank}</div>
                         <div className="flex-1 text-3xl font-bold text-white truncate pl-4 pr-2">{item.team.name}</div>
                         <div className="text-gray-400 text-xl truncate max-w-[200px]">{item.team.clubs.join(' / ')}</div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {slide.type === 'idle' && (
             <div className="flex items-center justify-center h-full flex-col text-gray-600 space-y-6">
                <Trophy size={120} className="text-[#333333]" />
                <h2 className="heading-font text-4xl font-bold uppercase">Turnier startet in Kürze</h2>
                <p className="text-xl">Die Bildschirme werden automatisch aktualisiert, sobald Daten verfügbar sind.</p>
             </div>
          )}
        </main>
      </div>
    );
  }

  // --- UI RENDER: ORGANIZER MODE ---
  return (
    <div className={`min-h-screen bg-[#F5F7FA] text-[#333333] font-sans pb-12 relative ${printView === 'sheets' ? 'bg-white' : ''}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&family=Open+Sans:wght@400;600;700&display=swap');
        body, button, input, select, textarea { font-family: 'Open Sans', sans-serif; }
        .heading-font, h1, h2, h3, h4, h5, h6, th, .uppercase, .font-extrabold { font-family: 'Montserrat', sans-serif; }
      `}</style>
      
      <header className={`relative bg-white text-[#222222] shadow-sm border-b-[4px] border-[#E3000F] ${printView === 'sheets' ? 'hidden' : 'print:hidden'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-full flex items-center justify-center p-0.5 shadow-sm border-[2px]">
               <img src={BRAND.logo} alt="Logo" className="w-full h-full rounded-full object-contain" />
            </div>
            <div>
              <h1 className="heading-font text-2xl font-black hidden md:block tracking-tight text-[#222222] uppercase">{BRAND.name}</h1>
              <div className="heading-font text-xs font-bold text-[#E3000F] uppercase tracking-widest hidden md:block">Turnier-Veranstalter</div>
            </div>
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            <label className="heading-font uppercase tracking-wider text-xs flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-md cursor-pointer transition font-bold border border-gray-200">
               <Upload size={16} /> <span className="hidden sm:inline">Laden</span>
               <input type="file" accept=".json" className="hidden" onChange={handleImportTournament} />
            </label>
            <button onClick={handleExportTournament} className="heading-font uppercase tracking-wider text-xs flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-md transition font-bold border border-gray-200">
               <Download size={16} /> <span className="hidden sm:inline">Speichern</span>
            </button>
            <div className="w-px bg-gray-300 mx-1 sm:mx-2"></div>
            
            <button onClick={handleSimulateTournament} disabled={simState !== 'idle'}
              className={`heading-font uppercase tracking-wider text-xs flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-md font-bold transition shadow-sm ${simState !== 'idle' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#E3000F] hover:bg-[#C2000D] text-white animate-pulse'}`}
            >
              {simState !== 'idle' ? <><Loader2 size={16} className="animate-spin" /> <span className="hidden sm:inline">Simuliere...</span></> : <><FastForward size={16} /> <span className="hidden sm:inline">Simulieren</span></>}
            </button>
            <button onClick={() => window.print()} className="heading-font uppercase tracking-wider text-xs flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-md transition font-bold border border-gray-200">
              <Printer size={16} /> <span className="hidden sm:inline">Drucken</span>
            </button>
            <button onClick={() => setAppMode('monitor')} className="heading-font uppercase tracking-wider text-xs flex items-center space-x-2 bg-[#222222] hover:bg-[#333333] text-white px-3 sm:px-4 py-2 rounded-md transition shadow-sm font-bold border border-[#111111]">
              <Tv size={16} /> <span className="hidden sm:inline">Monitor</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${printView === 'sheets' ? 'hidden' : 'print:p-0 print:max-w-none'}`}>
        
        <div className="flex space-x-1 bg-white border border-gray-200 p-1 rounded-md mb-8 print:hidden shadow-sm overflow-x-auto">
          {[
            { id: 'registration', icon: Users, label: 'Anmeldung' },
            { id: 'groups', icon: Shield, label: 'Gruppen' },
            { id: 'schedule', icon: Calendar, label: 'Spielplan' },
            { id: 'bracket', icon: Trophy, label: 'K.O.-Baum' },
            { id: 'rankings', icon: Award, label: 'Rangliste' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`heading-font uppercase tracking-wider text-xs flex-1 min-w-[120px] flex items-center justify-center space-x-2 py-3 px-4 rounded font-bold transition-all ${
                activeTab === t.id ? 'bg-[#E3000F] shadow-sm text-white' : 'text-gray-500 hover:text-[#222222] hover:bg-gray-50'
              }`}
            >
              <t.icon size={16} /> <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 print:border-none print:shadow-none print:p-0">
          
          {/* TAB 1: REGISTRATION */}
          {activeTab === 'registration' && (
            <div className="space-y-8 print:hidden">
              <div className="flex justify-between items-center bg-gray-50 p-6 rounded-md border border-gray-200">
                <div>
                  <h2 className="heading-font text-xl font-extrabold text-[#222222] uppercase">Turnier-Einstellungen</h2>
                  <p className="text-gray-600 text-sm mt-1">Teams manuell registrieren oder Testdaten laden. Startzeiten unten bearbeiten.</p>
                </div>
                <button onClick={loadMockData} className="heading-font uppercase tracking-wider text-xs flex items-center space-x-2 bg-white text-[#222222] border border-gray-300 px-5 py-2.5 rounded-md shadow-sm hover:bg-gray-100 font-bold transition">
                  <Play size={16} /> <span>Test-Teams laden</span>
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                   <div className="flex items-center space-x-3 col-span-1 md:col-span-3">
                     <Calendar className="text-gray-500" />
                     <div className="font-bold text-[#222222]">Turnierdauer:</div>
                     <select value={tournamentDays} onChange={(e) => setTournamentDays(Number(e.target.value))} className="p-2 border rounded font-bold text-[#222222] focus:ring-[#E3000F] focus:border-[#E3000F] bg-white shadow-sm outline-none">
                       <option value={1}>1-Tages-Turnier (Alle Spiele an Tag 1)</option>
                       <option value={2}>2-Tages-Turnier (K.O.-Spiele an Tag 2)</option>
                     </select>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                     <Clock className="text-gray-500" />
                     <div className="font-bold text-[#222222]">{tournamentDays === 1 ? 'Turnier-Startzeit:' : 'Startzeit Tag 1:'}</div>
                     <input type="time" value={day1Start} onChange={(e) => setDay1Start(e.target.value)} className="p-2 border rounded font-bold text-[#E3000F] focus:ring-[#E3000F] focus:border-[#E3000F] shadow-sm outline-none" />
                  </div>
                  {tournamentDays === 2 && (
                    <div className="flex items-center space-x-3">
                       <Clock className="text-gray-500" />
                       <div className="font-bold text-[#222222]">Startzeit Tag 2 (K.O.):</div>
                       <input type="time" value={day2Start} onChange={(e) => setDay2Start(e.target.value)} className="p-2 border rounded font-bold text-[#E3000F] focus:ring-[#E3000F] focus:border-[#E3000F] shadow-sm outline-none" />
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center space-x-3">
                  <input type="checkbox" id="isolateFinals" checked={isolateGrandFinals} onChange={(e) => setIsolateGrandFinals(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[#E3000F] focus:ring-[#E3000F]" />
                  <label htmlFor="isolateFinals" className="font-bold text-[#222222]">Finale isolieren (Nach allen anderen Spielen ansetzen, um die Aufmerksamkeit zu fokussieren)</label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1 bg-gray-50 p-6 rounded-md border border-gray-200 h-fit">
                  <h3 className="heading-font font-extrabold text-lg mb-4 flex items-center text-[#222222] uppercase">
                    {editingTeam ? <Edit2 size={18} className="mr-2 text-yellow-600"/> : <PlusCircle size={18} className="mr-2 text-[#E3000F]"/>} 
                    {editingTeam ? 'Team bearbeiten' : 'Neues Team'}
                  </h3>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="p-3 bg-white border border-gray-200 rounded space-y-3">
                      <div className="heading-font text-xs font-bold text-gray-500 uppercase tracking-wider">Spieler 1</div>
                      <div><input value={regForm.p1Name} onChange={e=>setRegForm({...regForm, p1Name: e.target.value})} className="w-full p-2 border rounded text-sm font-medium focus:ring-[#E3000F] focus:border-[#E3000F] outline-none" placeholder="Vollständiger Name" required /></div>
                      <div><input value={regForm.p1Club} onChange={e=>setRegForm({...regForm, p1Club: e.target.value})} className="w-full p-2 border rounded text-sm font-medium focus:ring-[#E3000F] focus:border-[#E3000F] outline-none" placeholder="Verein (Optional)" /></div>
                    </div>
                    <div className="p-3 bg-white border border-gray-200 rounded space-y-3">
                      <div className="heading-font text-xs font-bold text-gray-500 uppercase tracking-wider">Spieler 2</div>
                      <div><input value={regForm.p2Name} onChange={e=>setRegForm({...regForm, p2Name: e.target.value})} className="w-full p-2 border rounded text-sm font-medium focus:ring-[#E3000F] focus:border-[#E3000F] outline-none" placeholder="Vollständiger Name" required /></div>
                      <div><input value={regForm.p2Club} onChange={e=>setRegForm({...regForm, p2Club: e.target.value})} className="w-full p-2 border rounded text-sm font-medium focus:ring-[#E3000F] focus:border-[#E3000F] outline-none" placeholder="Verein (Optional)" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-bold text-[#222222] mb-1">Spielstärke</label>
                        <select value={regForm.level} onChange={e=>setRegForm({...regForm, level: e.target.value})} className="w-full p-2 border rounded font-medium outline-none">
                          <option value="3">3 - Fortgeschritten</option><option value="2">2 - Mittel</option><option value="1">1 - Anfänger</option>
                        </select></div>
                      <div><label className="block text-sm font-bold text-[#222222] mb-1">Kategorie</label>
                        <select value={regForm.category} onChange={e=>setRegForm({...regForm, category: e.target.value})} className="w-full p-2 border rounded font-medium outline-none">
                          <option value="U50">U50</option><option value="O50">O50</option>
                        </select></div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button type="submit" className={`heading-font uppercase tracking-wider text-xs flex-1 text-white py-3 rounded font-bold shadow-sm transition ${editingTeam ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-[#E3000F] hover:bg-[#C2000D]'}`}>
                        {editingTeam ? 'Team aktualisieren' : 'Registrieren'}
                      </button>
                      {editingTeam && (
                        <button type="button" onClick={() => {setEditingTeam(null); setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });}} className="heading-font uppercase tracking-wider text-xs px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold transition">
                          Abbrechen
                        </button>
                      )}
                    </div>
                  </form>
                </div>
                
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="heading-font font-extrabold text-lg text-[#222222] uppercase">Registrierte Teams ({teams.length})</h3>
                  </div>
                  <div className="overflow-auto max-h-[600px] border border-gray-200 rounded-md shadow-inner bg-gray-50/50">
                    <table className="w-full text-left text-sm table-fixed">
                      <thead className="heading-font bg-gray-100 sticky top-0 shadow-sm z-10 text-gray-600 uppercase text-xs tracking-wider">
                        <tr>
                          <th className="p-3 border-b border-gray-200 w-1/3">Team</th>
                          <th className="p-3 border-b border-gray-200 w-1/4">Vereine</th>
                          <th className="p-3 border-b border-gray-200 w-20">Kat</th>
                          <th className="p-3 border-b border-gray-200 w-16 text-center text-[#E3000F]">PIN</th>
                          <th className="p-3 border-b border-gray-200 w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">Noch keine Teams registriert.</td></tr> : 
                         teams.map((t) => (
                          <tr key={t.id} className={`border-b border-gray-100 last:border-0 hover:bg-white transition ${editingTeam?.id === t.id ? 'bg-yellow-50 hover:bg-yellow-50' : ''}`}>
                            <td className="p-3 font-bold text-[#222222] truncate">{t.name}</td>
                            <td className="p-3 text-xs text-gray-500 truncate">{t.clubs.join(' / ') || 'Kein Verein'}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded-sm text-xs font-bold shadow-sm ${t.category==='U50'?'bg-gray-200 text-[#222222]':'bg-gray-300 text-[#222222]'}`}>{t.category}</span></td>
                            <td className="p-3 text-center font-mono font-bold text-[#E3000F] bg-red-50/50">{t.pin}</td>
                            <td className="p-3 text-right space-x-2">
                               <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-yellow-600 transition"><Edit2 size={16}/></button>
                               <button onClick={() => confirmDelete === t.id ? handleDelete(t.id) : setConfirmDelete(t.id)} className={`transition ${confirmDelete === t.id ? 'text-white bg-[#E3000F] px-2 rounded font-bold shadow-sm' : 'text-gray-400 hover:text-[#E3000F]'}`}>
                                  {confirmDelete === t.id ? 'Sicher?' : <Trash2 size={16}/>}
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

          {/* TAB 2: GROUPS & STANDINGS */}
          {activeTab === 'groups' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center print:hidden">
                <p className="text-gray-500">Gruppen, ausbalanciert nach Spielstärke und Vereinszugehörigkeit.</p>
                <div className="space-x-3">
                   <button onClick={generateGroups} disabled={teams.length < 4} className="heading-font uppercase tracking-wider text-xs bg-gray-100 text-[#222222] hover:bg-gray-200 px-4 py-2 rounded-md font-bold disabled:opacity-50 transition border border-gray-300">
                     1. Gruppen neu generieren
                   </button>
                   <button onClick={() => setSchedulePrompt(true)} disabled={Object.keys(groups.U50).length === 0 && Object.keys(groups.O50).length === 0} className="heading-font uppercase tracking-wider text-xs bg-[#E3000F] text-white hover:bg-[#C2000D] px-4 py-2 rounded-md font-bold shadow-sm disabled:opacity-50 transition">
                     2. Spielplan erstellen
                   </button>
                </div>
              </div>

              {['U50', 'O50'].map(cat => (
                 groups[cat] && Object.keys(groups[cat]).length > 0 && (
                   <div key={cat} className="mb-10 page-break-after">
                     <h2 className="heading-font text-2xl font-extrabold text-[#222222] mb-6 border-b-2 border-gray-100 pb-2 flex items-center uppercase">
                       {CATEGORIES[cat]} <span className="ml-3 text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-600">{Object.keys(groups[cat]).length} Gruppen</span>
                     </h2>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(groups[cat]).map(([groupName, groupTeams]) => (
                          <div key={groupName} className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
                            <div className="heading-font bg-gray-100 p-3 font-extrabold text-[#222222] border-b border-gray-200 uppercase tracking-wider">{groupName}</div>
                            <table className="w-full text-sm text-left table-fixed">
                              <thead className="heading-font bg-white text-gray-400 uppercase text-xs tracking-wider">
                                <tr>
                                  <th className="px-4 py-2 w-12 border-b border-gray-100">Pos</th>
                                  <th className="px-4 py-2 border-b border-gray-100">Team</th>
                                  <th className="px-4 py-2 text-center w-16 border-b border-gray-100">S-N</th>
                                  <th className="px-4 py-2 text-center w-20 border-b border-gray-100">Sätze</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(standings[cat][groupName] || groupTeams).map((t, index) => (
                                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 font-bold text-gray-400">{index + 1}</td>
                                    <td className="px-4 py-3 truncate">
                                      <div className="font-bold text-[#222222] truncate">{t.name}</div>
                                      <div className="text-xs text-gray-500 truncate">{t.clubs.join(' / ')}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-[#222222]">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
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
                 <h2 className="heading-font text-xl font-extrabold text-[#222222] uppercase">Spielplan</h2>
                 <div className="flex space-x-3">
                   {matches.some(m => m.day === 1 && m.time === 'Flexibel') && (
                     <button onClick={() => { setPrintView('sheets'); setTimeout(() => { window.print(); setPrintView('normal'); }, 150); }} className="heading-font uppercase tracking-wider text-xs bg-[#222222] text-white px-4 py-2 rounded-md font-bold hover:bg-[#333333] transition shadow-sm flex items-center">
                       <Printer size={16} className="mr-2"/> Gruppen-Spielpläne drucken
                     </button>
                   )}
                   <button onClick={() => fillMissingScores('Group')} className="heading-font uppercase tracking-wider text-xs bg-gray-100 text-[#222222] px-4 py-2 rounded-md font-bold hover:bg-gray-200 transition border border-gray-300">
                     Gruppen-Ergebnisse auto-ausfüllen
                   </button>
                   <button onClick={handleKoGeneration} disabled={!canGenerateKO} className={`heading-font uppercase tracking-wider text-xs px-5 py-2 rounded-md font-bold shadow-sm transition flex items-center ${canGenerateKO ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-600/50 text-white/70 cursor-not-allowed'}`}>
                      <Trophy size={16} className="mr-2"/> 
                      {!canGenerateKO && groupMatches.length > 0 ? `Zuerst ${unplayedGroupCount} Gruppenspiele eintragen` : `K.O.-Baum erstellen ${tournamentDays === 2 ? '(Tag 2)' : ''}`}
                   </button>
                 </div>
               </div>

               <div className="space-y-8">
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
                    
                    return (
                      <div key={day} className="mb-8">
                        <h3 className="heading-font text-lg font-bold bg-[#222222] text-white p-4 rounded-t-md flex justify-between items-center shadow-sm uppercase tracking-wider border-t-4 border-[#E3000F]">
                          <span>{tournamentDays === 1 ? 'Alle Spiele (1-Tages-Turnier)' : `Tag ${day} ${day===1 ? '(Gruppenphase)' : '(Finals & Platzierungen)'}`}</span>
                          <span className="text-sm font-bold text-gray-300 bg-[#333333] px-3 py-1 rounded-sm">
                            {tournamentDays === 1 ? `Gruppen: ${day1Start} | K.O.: ${day2Start}` : `Start: ${day===1 ? day1Start : day2Start}`}
                          </span>
                        </h3>
                        <div className="border-x border-b border-gray-200 rounded-b-md overflow-hidden bg-white shadow-sm">
                          <table className="w-full text-sm table-fixed">
                            <thead className="heading-font bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                              <tr>
                                <th className="p-3 text-left w-20 border-b border-gray-200">Zeit</th>
                                <th className="p-3 text-left w-20 border-b border-gray-200">Platz</th>
                                <th className="p-3 text-left w-24 border-b border-gray-200">Phase</th>
                                <th className="p-3 text-right border-b border-gray-200">Team 1</th>
                                <th className="p-3 text-center w-40 border-b border-gray-200">Ergebnis</th>
                                <th className="p-3 text-left border-b border-gray-200">Team 2</th>
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
                                <tr key={m.id} className={`border-b border-gray-100 last:border-0 transition ${isMissingTeams || isBye || isUnscheduled ? '' : 'cursor-pointer hover:bg-gray-50'}`} 
                                    onClick={() => !isMissingTeams && !isBye && !isUnscheduled && setScoreModal(m)}>
                                  <td className={`p-3 font-bold ${isUnscheduled ? 'text-[#E3000F]' : (m.time === 'Flexibel' ? 'text-gray-500 text-xs tracking-widest' : 'text-[#222222]')}`}>{m.time || 'Nicht angesetzt'}</td>
                                  <td className="p-3">{m.court ? <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-sm text-xs font-bold">Platz {m.court}</span> : '-'}</td>
                                  <td className="p-3 text-xs truncate"><span className="block font-bold text-[#E3000F]">{CATEGORIES[m.category]?.substring(0,3)} {m.category}</span><span className="text-gray-500 font-medium">{formatStageGroupName(m.stage, m.groupName)}</span></td>
                                  <td className={`p-3 text-right truncate ${isT1Winner ? 'font-bold text-green-700' : 'font-medium text-[#222222]'}`}>
                                    {m.team1?.isBye ? <span className="text-[#E3000F] font-bold italic">Kommt weiter (Freilos)</span> : (m.team1?.name || 'Offen')}
                                  </td>
                                  <td className="p-3 text-center bg-gray-50/50 border-x border-gray-100">
                                     {isBye ? <span className="text-gray-400 italic text-xs font-bold">KEIN SPIEL</span> : renderScore(m.score)}
                                  </td>
                                  <td className={`p-3 text-left truncate ${isT2Winner ? 'font-bold text-green-700' : 'font-medium text-[#222222]'}`}>
                                    {m.team2?.isBye ? <span className="text-[#E3000F] font-bold italic">Kommt weiter (Freilos)</span> : (m.team2?.name || 'Offen')}
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
                   let displayTitle = formatStageGroupName(match ? match.stage : null, title || (match ? match.groupName : 'Offen'));
                   if (!match) return <div className="w-64 h-24 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 text-sm font-bold m-2 break-inside-avoid">Offen</div>;
                   const t1IsBye = match.team1?.isBye; const t2IsBye = match.team2?.isBye;
                   if (t1IsBye && t2IsBye) return null;
                   return (
                     <div className="w-64 border border-gray-300 rounded-md bg-white shadow-sm overflow-hidden m-2 print:border-gray-400 print:shadow-none break-inside-avoid">
                        <div className="heading-font bg-gray-100 text-xs text-center py-1 font-extrabold text-gray-600 border-b border-gray-200 uppercase tracking-wider">{displayTitle}</div>
                        <div className={`p-2 border-b border-gray-100 flex justify-between ${match.winnerId === match.team1?.id ? 'bg-green-50 font-bold text-green-900' : 'text-[#222222]'}`}>
                          <span className={`truncate pr-2 ${t1IsBye ? 'text-[#E3000F] italic font-bold text-xs' : 'font-medium'}`}>{t1IsBye ? 'Kommt weiter (Freilos)' : (match.team1?.name || 'Offen')}</span>
                          {!t1IsBye && !t2IsBye && <span className="font-bold">{match.score?.s1[0]} {match.score?.s2[0]}</span>}
                        </div>
                        <div className={`p-2 flex justify-between ${match.winnerId === match.team2?.id ? 'bg-green-50 font-bold text-green-900' : 'text-[#222222]'}`}>
                          <span className={`truncate pr-2 ${t2IsBye ? 'text-[#E3000F] italic font-bold text-xs' : 'font-medium'}`}>{t2IsBye ? 'Kommt weiter (Freilos)' : (match.team2?.name || 'Offen')}</span>
                          {!t1IsBye && !t2IsBye && <span className="font-bold">{match.score?.s1[1]} {match.score?.s2[1]}</span>}
                        </div>
                     </div>
                   );
                 };

                 return (
                   <div key={cat} className="mb-16 page-break-after">
                      <h2 className="heading-font text-2xl font-extrabold text-[#222222] mb-8 border-b-2 border-gray-200 pb-2 flex items-center uppercase">
                         <Trophy className="text-[#E3000F] mr-3"/> Hauptrunde: {CATEGORIES[cat]}
                      </h2>
                      <div className="flex items-center space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-4 h-[600px]">
                           {brackets[cat].qf.map((qf, i) => ( <div key={i} className="relative"><MatchBox match={getMatchData(qf.id)} title={`Viertelfinale ${i+1}`} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div></div> ))}
                        </div>
                        <div className="flex flex-col justify-around h-[600px]">
                           {brackets[cat].sf.map((sf, i) => ( <div key={i} className="relative"><div className="absolute top-[-100px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-md"></div><div className="absolute bottom-[-100px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-md"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div><MatchBox match={getMatchData(sf.id)} title={sf.title} /><div className="absolute top-1/2 -right-6 w-6 border-b-2 border-gray-300"></div></div> ))}
                        </div>
                        <div className="flex flex-col justify-center h-[600px]">
                           <div className="relative"><div className="absolute top-[-150px] -left-6 bottom-[50%] border-l-2 border-gray-300 rounded-tl-md"></div><div className="absolute bottom-[-150px] -left-6 top-[50%] border-l-2 border-gray-300 rounded-bl-md"></div><div className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-300"></div><MatchBox match={getMatchData(brackets[cat].finals[0].id)} title="FINALE" /></div>
                        </div>
                      </div>

                      <h3 className="heading-font text-xl font-bold text-gray-600 mt-12 mb-4 border-b border-gray-200 pb-2 uppercase tracking-wider">Platzierungsspiele (Plätze 3-8)</h3>
                      <div className="flex items-start space-x-12 min-w-max">
                        <div className="flex flex-col justify-around space-y-4">
                           {brackets[cat].pSf.map((pSf, i) => ( <div key={i} className="relative"><MatchBox match={getMatchData(pSf.id)} title={pSf.title} /></div> ))}
                        </div>
                        <div className="flex flex-col justify-around space-y-4">
                           <MatchBox match={getMatchData(brackets[cat].finals[2].id)} title="Spiel um Platz 5" />
                           <MatchBox match={getMatchData(brackets[cat].finals[3].id)} title="Spiel um Platz 7" />
                        </div>
                      </div>
                      <div className="mt-4"><MatchBox match={getMatchData(brackets[cat].finals[1].id)} title="Spiel um Platz 3" /></div>
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
                      <h2 className="heading-font text-2xl font-extrabold text-[#222222] mb-6 border-b-2 border-gray-200 pb-2 flex items-center uppercase">
                        <Award className="mr-3 text-[#E3000F]" /> Abschlussplatzierungen: {CATEGORIES[cat]}
                      </h2>
                      <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm table-fixed">
                           <thead className="heading-font bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                             <tr>
                               <th className="p-4 w-20 text-center border-r border-gray-200">Platz</th>
                               <th className="p-4 w-1/3">Team</th>
                               <th className="p-4">Vereine</th>
                               <th className="p-4 w-32 text-center">Status</th>
                             </tr>
                           </thead>
                           <tbody>
                             {finalRankings[cat].map((item, idx) => (
                               <tr key={item.team.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition 
                                 ${idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-gray-50' : idx === 2 ? 'bg-[#E3000F]/5' : ''}`}>
                                 <td className="p-4 text-center font-extrabold text-lg border-r border-gray-200 text-[#222222]">
                                   {idx === 0 ? '🏆 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : item.rank}
                                 </td>
                                 <td className="p-4 font-bold text-[#222222] truncate">{item.team.name}</td>
                                 <td className="p-4 text-gray-500 font-medium truncate">{item.team.clubs.join(' / ')}</td>
                                 <td className="p-4 text-center">
                                   {idx < 8 
                                     ? <span className="bg-gray-200 text-[#222222] px-2 py-1 rounded-sm text-xs font-bold shadow-sm">K.O.-Phase</span> 
                                     : <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-sm text-xs font-bold shadow-sm">Gruppenphase</span>}
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

      {/* --- PRINTABLE GROUP SHEETS --- */}
      {printView === 'sheets' && (
        <div className="hidden print:block w-full bg-white text-black p-8">
          {['U50', 'O50'].map(cat => {
            if (!groups[cat] || Object.keys(groups[cat]).length === 0) return null;
            return Object.entries(groups[cat]).map(([groupName, groupTeams]) => {
              const gMatches = matches.filter(m => m.category === cat && m.groupName === groupName && m.stage === 'Group').sort((a,b) => (a.matchOrder || 0) - (b.matchOrder || 0));
              if (gMatches.length === 0) return null;
              const courtNum = gMatches[0].court;
              return (
                <div key={`${cat}-${groupName}`} className="page-break-after pb-10">
                   {/* Sheet Header */}
                   <div className="flex justify-between items-end border-b-4 border-[#222222] pb-4 mb-6">
                      <div>
                         <h1 className="heading-font text-4xl font-black uppercase text-[#222222]">{BRAND.name}</h1>
                         <div className="text-xl font-bold text-gray-500 mt-1">Offizieller Gruppen-Spielbericht</div>
                      </div>
                      <div className="text-right">
                         <h2 className="heading-font text-3xl font-extrabold text-[#222222] uppercase">{CATEGORIES[cat]}</h2>
                         <h3 className="heading-font text-2xl font-bold text-[#E3000F] mt-1 uppercase tracking-wider">{groupName} • Zugewiesener Platz {courtNum}</h3>
                      </div>
                   </div>
                   
                   {/* Empty Score Table */}
                   <table className="w-full text-left border-collapse border-2 border-[#222222] mb-6">
                      <thead className="bg-gray-100 heading-font uppercase">
                        <tr>
                          <th className="border-2 border-[#222222] p-4 text-lg w-1/3">Team 1</th>
                          <th className="border-2 border-[#222222] p-4 text-lg w-1/3">Team 2</th>
                          <th className="border-2 border-[#222222] p-4 text-center">Satz 1</th>
                          <th className="border-2 border-[#222222] p-4 text-center">Satz 2</th>
                          <th className="border-2 border-[#222222] p-4 text-center">Tiebreak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gMatches.map(m => (
                          <tr key={m.id}>
                             <td className="border-2 border-[#222222] p-5 font-bold text-xl">{m.team1.name}</td>
                             <td className="border-2 border-[#222222] p-5 font-bold text-xl">{m.team2.name}</td>
                             <td className="border-2 border-[#222222] p-5"></td>
                             <td className="border-2 border-[#222222] p-5"></td>
                             <td className="border-2 border-[#222222] p-5"></td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                   <div className="text-gray-600 italic font-medium text-lg text-center mt-8">Bitte füllen Sie die Ergebnisse leserlich aus und bringen Sie diesen Bogen nach Abschluss aller Spiele zur Turnierleitung.</div>
                </div>
              )
            })
          })}
        </div>
      )}

      {/* --- SCORE ENTRY MODAL --- */}
      {scoreModal && (
        <div className="fixed inset-0 bg-[#222222]/80 flex items-center justify-center z-50 print:hidden p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#E3000F] p-4 flex justify-between items-center text-white">
               <h3 className="heading-font font-bold uppercase tracking-wider">Spielergebnis eintragen</h3>
               <button onClick={() => setScoreModal(null)} className="hover:text-red-200 transition"><X size={20}/></button>
            </div>
            <form onSubmit={(e) => {
               e.preventDefault(); const fd = new FormData(e.target);
               handleSaveScore(scoreModal.id, [parseInt(fd.get('s1_t1')||0), parseInt(fd.get('s1_t2')||0)], [parseInt(fd.get('s2_t1')||0), parseInt(fd.get('s2_t2')||0)], [parseInt(fd.get('tb_t1')||0), parseInt(fd.get('tb_t2')||0)]);
            }} className="p-6">
              <div className="heading-font flex justify-between items-end mb-4 font-bold text-sm text-gray-500 border-b border-gray-200 pb-2 uppercase tracking-wider">
                <div className="w-1/2">Teams</div><div className="w-12 text-center">Satz 1</div><div className="w-12 text-center">Satz 2</div><div className="w-12 text-center text-orange-500">Tiebreak</div>
              </div>
              <div className="flex justify-between items-center mb-4">
                <div className="w-1/2 font-bold text-[#222222] truncate pr-2">{scoreModal.team1?.name}</div>
                <input name="s1_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[0]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50 focus:border-[#E3000F] focus:ring-0 outline-none" required />
                <input name="s2_t1" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[0]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50 focus:border-[#E3000F] focus:ring-0 outline-none" required />
                <input name="tb_t1" type="number" min="0" max="20" defaultValue={scoreModal.score?.tb[0]} className="w-12 p-2 border rounded text-center font-bold bg-orange-50 text-orange-700 focus:border-orange-500 focus:ring-0 outline-none" />
              </div>
              <div className="flex justify-between items-center mb-8">
                <div className="w-1/2 font-bold text-[#222222] truncate pr-2">{scoreModal.team2?.name}</div>
                <input name="s1_t2" type="number" min="0" max="7" defaultValue={scoreModal.score?.s1[1]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50 focus:border-[#E3000F] focus:ring-0 outline-none" required />
                <input name="s2_t2" type="number" min="0" max="7" defaultValue={scoreModal.score?.s2[1]} className="w-12 p-2 border rounded text-center font-bold bg-gray-50 focus:border-[#E3000F] focus:ring-0 outline-none" required />
                <input name="tb_t2" type="number" min="0" max="20" defaultValue={scoreModal.score?.tb[1]} className="w-12 p-2 border rounded text-center font-bold bg-orange-50 text-orange-700 focus:border-orange-500 focus:ring-0 outline-none" />
              </div>
              <button type="submit" className="heading-font uppercase tracking-wider w-full bg-[#E3000F] text-white py-3 rounded font-bold hover:bg-[#C2000D] flex items-center justify-center shadow-md transition">
                 <CheckCircle size={18} className="mr-2" /> Ergebnis speichern
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- SCHEDULE GENERATION PROMPT MODAL --- */}
      {schedulePrompt && (
        <div className="fixed inset-0 bg-[#222222]/80 flex items-center justify-center z-50 print:hidden p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#E3000F] p-4 flex justify-between items-center text-white">
               <h3 className="heading-font font-bold uppercase tracking-wider flex items-center"><Calendar size={20} className="mr-2"/> Tag 1 Spielplan-Methode</h3>
               <button onClick={() => setSchedulePrompt(false)} className="hover:text-red-200 transition"><X size={20}/></button>
            </div>
            <div className="p-6">
              <p className="text-[#222222] mb-6 font-medium">
                Wie möchten Sie die Spiele der Gruppenphase ansetzen?
              </p>
              <div className="flex flex-col space-y-3">
                <button onClick={() => generateSchedule('traditional')} className="bg-gray-100 text-[#222222] p-4 rounded-md font-bold hover:bg-gray-200 transition text-left flex flex-col border border-gray-200">
                   <span className="heading-font text-lg mb-1 uppercase tracking-wider">1. Klassische Zeitfenster</span> 
                   <span className="text-sm font-medium text-gray-500">Weist jedem Spiel eine spezifische Startzeit und einen Platz zu.</span>
                </button>
                <button onClick={() => generateSchedule('courtPerGroup')} className="bg-red-50 text-[#E3000F] border border-red-200 p-4 rounded-md font-bold hover:bg-red-100 transition text-left flex flex-col shadow-sm">
                   <span className="heading-font text-lg mb-1 uppercase tracking-wider">2. Plätze an Gruppen zuweisen (Flexibel)</span> 
                   <span className="text-sm font-medium text-[#C2000D]">Jede Gruppe bekommt einen festen Platz für den gesamten Tag. Zeiten sind flexibel. Erstellt druckbare Spielberichte.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- K.O. GENERATION PROMPT MODAL --- */}
      {koPrompt && (
        <div className="fixed inset-0 bg-[#222222]/80 flex items-center justify-center z-50 print:hidden p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="bg-yellow-600 p-4 flex justify-between items-center text-white">
               <h3 className="heading-font font-bold uppercase tracking-wider flex items-center"><AlertTriangle size={20} className="mr-2"/> Turnierbaum-Einstellungen erforderlich</h3>
               <button onClick={() => setKoPrompt(false)} className="hover:text-amber-100 transition"><X size={20}/></button>
            </div>
            <div className="p-6">
              <p className="text-[#222222] mb-6 font-medium">
                Sie haben nicht genügend Gruppen, um ein 8-Team-Viertelfinale nur mit den Top {koQualifyCount} Teams perfekt zu füllen. Wie möchten Sie die leeren Plätze auffüllen?
              </p>
              <div className="flex flex-col space-y-3">
                <button onClick={() => generateKO(2, false)} className="bg-gray-100 text-[#222222] py-3 px-4 rounded-md font-bold hover:bg-gray-200 transition text-left flex justify-between items-center">
                   <span className="heading-font uppercase tracking-wider text-sm">1. Plätze leer lassen</span> <span className="text-xs bg-gray-300 px-2 py-1 rounded-sm text-gray-700">Verwendet Freilose</span>
                </button>
                <button onClick={() => generateKO(2, true)} className="bg-red-50 text-[#E3000F] border border-red-200 py-3 px-4 rounded-md font-bold hover:bg-red-100 transition text-left flex justify-between items-center shadow-sm">
                   <span className="heading-font uppercase tracking-wider text-sm">2. Beste verbleibende Teams nehmen</span> <span className="text-xs bg-[#E3000F] text-white px-2 py-1 rounded-sm">Empfohlene Wildcards</span>
                </button>
                <button onClick={() => generateKO(3, false)} className="bg-gray-100 text-[#222222] py-3 px-4 rounded-md font-bold hover:bg-gray-200 transition text-left flex justify-between items-center">
                   <span className="heading-font uppercase tracking-wider text-sm">3. Top 3 aus allen Gruppen weiterlassen</span> <span className="text-xs bg-gray-300 px-2 py-1 rounded-sm text-gray-700">Striktes Limit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print { body { background: white; -webkit-print-color-adjust: exact; } .page-break-after { page-break-after: always; } .break-inside-avoid { break-inside: avoid; } @page { size: A3 landscape; margin: 1cm; } }
      `}} />
    </div>
  );
}