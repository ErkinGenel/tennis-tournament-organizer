import { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Users, Calendar, Trash2, Edit, Save, Upload, Monitor, LayoutDashboard, 
  Clock, Smartphone, Play, CheckCircle, ChevronRight, X, Lock, Loader2, FastForward, 
  Edit2, Download, Award, Tv, LogOut, User, AlertTriangle, Shield, PlusCircle, Printer, GitCommit, QrCode,
  CheckSquare, Plus, Minus, FileSignature
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

const GlobalStyles = () => (
  <style>{`
    :root {
      --contrast: #222222;
      --contrast-2: #575760;
      --contrast-3: #b2b2be;
      --base: #f0f0f0;
      --base-2: #f7f8f9;
      --base-3: #ffffff;
      --tcw-green: #008236;
      --tcw-orange: #CC4E00;
      --tcw-yellow: #ECF241;
      --tcw-green-dark: #003616;
      --tcw-green-light: #00D95A;
      --global-color-12: #ffa347;
      --global-color-13: #db7833;
    }
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&family=Open+Sans:wght@400;600;700&display=swap');
    body, button, input, select, textarea { font-family: 'Open Sans', sans-serif; }
    .heading-font, h1, h2, h3, h4, h5, h6, th, .uppercase, .font-extrabold { font-family: 'Montserrat', sans-serif; }
  `}</style>
);

const BRAND = {
  logo: "https://erkingenel.github.io/tennis-tournament-organizer/50JahreLogo3.png", 
  banner: "https://erkingenel.github.io/tennis-tournament-organizer/50JahreLogo3.jpg?auto=format&fit=crop&w=2000&q=80", 
  sponsorBanner: "https://erkingenel.github.io/tennis-tournament-organizer/kessler_wtb.png",
  name: "TC Wannweil e.V."
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
const LEVELS = [3, 2, 1]; 
const MOCK_CLUBS = ['TC Wannweil', 'TC Reutlingen', 'TC Tübingen', 'TC Metzingen', 'TC Pfullingen', 'TV Kirchentellinsfurt'];
const MOCK_FIRST_NAMES = ['Lukas', 'Maximilian', 'Jonas', 'Paul', 'Leon', 'Finn', 'Elias', 'Ben', 'Luis', 'Felix', 'Markus', 'Thomas', 'Michael', 'Andreas', 'Stefan', 'Christian', 'Martin', 'Daniel'];
const MOCK_LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer'];

const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

const formatStageGroupName = (stage, rawName) => {
    if (!rawName) return 'Offen';
    if (stage === 'Placement' || rawName.includes('Platzierungsspiel')) {
        if (rawName.includes('5-8') || rawName.includes('Halbfinale')) return 'Platzierungsspiel, 5-8';
        if (rawName.includes('Platz 3')) return 'Platzierungsspiel, Platz 3';
        if (rawName.includes('Platz 5')) return 'Platzierungsspiel, Platz 5';
        if (rawName.includes('Platz 7')) return 'Platzierungsspiel, Platz 7';
        return rawName.includes('Platzierungsspiel') ? rawName : `Platzierungsspiel, ${rawName}`; 
    }
    if (stage === 'Group') return rawName.includes('Gruppe') ? rawName : 'Gruppe ' + rawName;
    return rawName;
};

const getFormattedDate = (baseDateStr, dayOffset) => {
  if (!baseDateStr) return '';
  const d = new Date(baseDateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const timeToMins = (timeStr) => {
  if (!timeStr || timeStr === 'Flexibel' || timeStr === 'BYE') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const addMinutes = (timeStr, mins) => {
  if (!timeStr || timeStr === 'Flexibel' || timeStr === 'BYE') return timeStr;
  let [h, m] = timeStr.split(':').map(Number);
  m += mins;
  h += Math.floor(m / 60);
  m = m % 60;
  h = h % 24; 
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const generateTimeSlots = (startTimeStr, numSlots = 8, spacing = 105) => {
  const slots = [];
  let [hours, minutes] = startTimeStr.split(':').map(Number);
  for (let i = 0; i < numSlots; i++) {
    slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    minutes += spacing;
    if (minutes >= 60) { hours += Math.floor(minutes / 60); minutes = minutes % 60; }
    hours = hours % 24; 
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

const BracketConnector = ({ count, width = "w-10", borderColor = "border-[var(--contrast-3)]" }) => (
  <div className={`flex flex-col justify-around h-full relative z-0 ${width}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="w-full relative" style={{ height: `${100 / (count * 2)}%` }}>
         <div className={`absolute inset-y-0 left-0 w-1/2 border-t-2 border-b-2 border-r-2 ${borderColor} rounded-r-sm`}></div>
         <div className={`absolute top-1/2 right-0 w-1/2 border-b-2 ${borderColor}`}></div>
      </div>
    ))}
  </div>
);

const OfficialMatchBox = ({ match, title, isFinal=false }) => {
   if (!match) return <div className="w-64 h-[88px] border border-[var(--contrast-3)] rounded-md bg-[var(--base-2)] flex items-center justify-center text-[var(--contrast-3)] text-sm font-bold shadow-sm break-inside-avoid">Offen</div>;
   const t1IsBye = match.team1?.isBye; const t2IsBye = match.team2?.isBye;
   if (t1IsBye && t2IsBye) return null;
   
   const titleText = title || formatStageGroupName(match.stage, match.groupName);
   
   return (
     <div className={`w-64 bg-[var(--base-3)] shadow-sm rounded-md overflow-hidden border ${isFinal ? 'border-[var(--tcw-orange)] shadow-md' : 'border-[var(--contrast-3)]'} break-inside-avoid`}>
        <div className={`text-[10px] uppercase font-bold px-3 py-1 border-b border-[var(--base)] flex justify-between tracking-wider ${isFinal ? 'bg-[var(--tcw-orange)] text-[var(--base-3)]' : 'bg-[var(--base-2)] text-[var(--contrast-2)]'}`}>
           <span className="truncate pr-2">{titleText}</span>
           {match.time && match.time !== 'Flexibel' && <span>{match.time}</span>}
        </div>
        
        <div className={`flex items-stretch border-b border-[var(--base)] h-[32px] ${match.winnerId === match.team1?.id ? 'bg-[var(--base-3)]' : 'bg-[var(--base-2)]/50'}`}>
           <div className={`w-1 shrink-0 ${match.winnerId === match.team1?.id ? 'bg-[var(--tcw-green)]' : 'bg-transparent'}`}></div>
           <div className="flex-1 px-2 flex items-center min-w-0">
              <span className={`text-sm truncate w-full ${t1IsBye ? 'text-[var(--tcw-orange)] italic font-medium text-xs' : (match.winnerId === match.team1?.id ? 'font-bold text-[var(--contrast)]' : 'text-[var(--contrast-2)]')}`}>
                {t1IsBye ? 'Freilos' : (match.team1?.name || 'Offen')}
              </span>
           </div>
           {!t1IsBye && !t2IsBye && (
              <div className="flex border-l border-[var(--base)] divide-x divide-[var(--base)] shrink-0 bg-[var(--base-3)]">
                 <div className={`w-7 flex items-center justify-center text-sm ${match.winnerId === match.team1?.id ? 'font-bold text-[var(--contrast)]' : 'text-[var(--contrast-2)]'}`}>{match.score?.s1?.[0] ?? '-'}</div>
                 <div className={`w-7 flex items-center justify-center text-sm ${match.winnerId === match.team1?.id ? 'font-bold text-[var(--contrast)]' : 'text-[var(--contrast-2)]'}`}>{match.score?.s2?.[0] ?? '-'}</div>
                 <div className="w-7 flex items-center justify-center text-[10px] text-[var(--tcw-orange)] font-bold">{match.score?.tb && match.score.tb[0] > 0 ? match.score.tb[0] : ''}</div>
              </div>
           )}
        </div>

        <div className={`flex items-stretch h-[32px] ${match.winnerId === match.team2?.id ? 'bg-[var(--base-3)]' : 'bg-[var(--base-2)]/50'}`}>
           <div className={`w-1 shrink-0 ${match.winnerId === match.team2?.id ? 'bg-[var(--tcw-green)]' : 'bg-transparent'}`}></div>
           <div className="flex-1 px-2 flex items-center min-w-0">
              <span className={`text-sm truncate w-full ${t2IsBye ? 'text-[var(--tcw-orange)] italic font-medium text-xs' : (match.winnerId === match.team2?.id ? 'font-bold text-[var(--contrast)]' : 'text-[var(--contrast-2)]')}`}>
                {t2IsBye ? 'Freilos' : (match.team2?.name || 'Offen')}
              </span>
           </div>
           {!t1IsBye && !t2IsBye && (
              <div className="flex border-l border-[var(--base)] divide-x divide-[var(--base)] shrink-0 bg-[var(--base-3)]">
                 <div className={`w-7 flex items-center justify-center text-sm ${match.winnerId === match.team2?.id ? 'font-bold text-[var(--contrast)]' : 'text-[var(--contrast-2)]'}`}>{match.score?.s1?.[1] ?? '-'}</div>
                 <div className={`w-7 flex items-center justify-center text-sm ${match.winnerId === match.team2?.id ? 'font-bold text-[var(--contrast)]' : 'text-[var(--contrast-2)]'}`}>{match.score?.s2?.[1] ?? '-'}</div>
                 <div className="w-7 flex items-center justify-center text-[10px] text-[var(--tcw-orange)] font-bold">{match.score?.tb && match.score.tb[1] > 0 ? match.score.tb[1] : ''}</div>
              </div>
           )}
        </div>
     </div>
   );
};

const ScoreEntryModal = ({ match, onClose, onSave, categories }) => {
  const [score, setScore] = useState(() => {
    if (match.score) {
      const parsed = JSON.parse(JSON.stringify(match.score));
      return {
        s1: parsed.s1 || [0, 0],
        s2: parsed.s2 || [0, 0],
        tb: parsed.tb || [null, null]
      };
    }
    return { s1: [0, 0], s2: [0, 0], tb: [null, null] };
  });

  const updateScore = (set, teamIdx, delta) => {
    setScore(prev => {
      const newScore = { ...prev };
      let val = newScore[set][teamIdx];
      if (val === null) val = 0;
      val += delta;
      if (val < 0) val = 0;
      if (set !== 'tb' && val > 7) val = 7; 
      newScore[set][teamIdx] = val;
      return newScore;
    });
  };

  const handleSave = () => {
    const formatSet = (s) => (s[0] === null && s[1] === null) ? null : [s[0] || 0, s[1] || 0];
    onSave(match.id, formatSet(score.s1) || [0,0], formatSet(score.s2) || [0,0], (score.tb[0] > 0 || score.tb[1] > 0) ? score.tb : null);
  };

  const Stepper = ({ label, value, onIncrease, onDecrease, colorClass }) => (
    <div className="flex flex-col items-center">
      <div className="text-[10px] text-[var(--contrast-2)] font-bold uppercase mb-1">{label}</div>
      <div className="flex items-center bg-[var(--base-2)] rounded-lg border border-[var(--contrast-3)] overflow-hidden">
        <button type="button" onClick={onDecrease} className="px-4 py-3 bg-[var(--base-3)] hover:bg-[var(--base)] border-r border-[var(--contrast-3)] active:bg-[var(--contrast-3)] transition-colors"><Minus size={20} className="text-[var(--contrast)]" /></button>
        <div className={`w-12 text-center text-2xl font-black ${colorClass}`}>{value !== null ? value : '-'}</div>
        <button type="button" onClick={onIncrease} className="px-4 py-3 bg-[var(--base-3)] hover:bg-[var(--base)] border-l border-[var(--contrast-3)] active:bg-[var(--contrast-3)] transition-colors"><Plus size={20} className="text-[var(--contrast)]" /></button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[var(--contrast)]/90 flex flex-col items-center justify-center z-50 print:hidden p-4 md:p-8 backdrop-blur-sm">
      <div className="bg-[var(--base-3)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-full max-h-[800px] animate-in zoom-in-95">
        <div className="bg-[var(--tcw-green)] p-5 flex justify-between items-center text-[var(--base-3)] shrink-0">
           <div>
              <h3 className="font-bold text-xl heading-font flex items-center"><Edit2 size={24} className="mr-2"/> Ergebnis eintragen</h3>
              <div className="text-sm font-medium opacity-90 mt-1">{match.time} Uhr • Platz {match.court} • {categories[match.category]?.substring(0,3)} {match.category}</div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-[var(--tcw-green-dark)] rounded-full transition"><X size={28}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-center space-y-8">
           <div className="bg-[var(--base-3)] border-2 border-[var(--contrast-3)] rounded-xl p-4 md:p-6 shadow-sm">
              <div className="text-xl md:text-2xl font-black text-[var(--contrast)] mb-4 pb-2 border-b-2 border-[var(--base)] truncate">
                 {match.team1?.name || 'Offen'}
              </div>
              <div className="flex justify-around gap-2">
                 <Stepper label="Satz 1" value={score.s1[0]} onIncrease={() => updateScore('s1', 0, 1)} onDecrease={() => updateScore('s1', 0, -1)} colorClass="text-[var(--contrast)]" />
                 <Stepper label="Satz 2" value={score.s2[0]} onIncrease={() => updateScore('s2', 0, 1)} onDecrease={() => updateScore('s2', 0, -1)} colorClass="text-[var(--contrast)]" />
                 <Stepper label="Tiebreak" value={score.tb[0]} onIncrease={() => updateScore('tb', 0, 1)} onDecrease={() => updateScore('tb', 0, -1)} colorClass="text-[var(--tcw-orange)]" />
              </div>
           </div>

           <div className="flex items-center justify-center">
              <div className="h-px bg-[var(--contrast-3)] flex-1"></div>
              <span className="px-4 text-[var(--contrast-3)] font-bold text-lg uppercase tracking-widest">Gegen</span>
              <div className="h-px bg-[var(--contrast-3)] flex-1"></div>
           </div>

           <div className="bg-[var(--base-3)] border-2 border-[var(--contrast-3)] rounded-xl p-4 md:p-6 shadow-sm">
              <div className="text-xl md:text-2xl font-black text-[var(--contrast)] mb-4 pb-2 border-b-2 border-[var(--base)] truncate">
                 {match.team2?.name || 'Offen'}
              </div>
              <div className="flex justify-around gap-2">
                 <Stepper label="Satz 1" value={score.s1[1]} onIncrease={() => updateScore('s1', 1, 1)} onDecrease={() => updateScore('s1', 1, -1)} colorClass="text-[var(--contrast)]" />
                 <Stepper label="Satz 2" value={score.s2[1]} onIncrease={() => updateScore('s2', 1, 1)} onDecrease={() => updateScore('s2', 1, -1)} colorClass="text-[var(--contrast)]" />
                 <Stepper label="Tiebreak" value={score.tb[1]} onIncrease={() => updateScore('tb', 1, 1)} onDecrease={() => updateScore('tb', 1, -1)} colorClass="text-[var(--tcw-orange)]" />
              </div>
           </div>
        </div>

        <div className="p-4 md:p-6 bg-[var(--base-2)] border-t border-[var(--contrast-3)] shrink-0">
           <button onClick={handleSave} className="w-full bg-[var(--tcw-green)] text-[var(--base-3)] py-4 rounded-xl font-black text-xl hover:bg-[var(--tcw-green-dark)] active:scale-[0.98] flex items-center justify-center shadow-lg transition-all">
              <CheckCircle size={28} className="mr-3" /> ERGEBNIS SPEICHERN
           </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [appMode, setAppMode] = useState('login');
  const [passwordInput, setPasswordInput] = useState('');
  const [monitorPassword, setMonitorPassword] = useState('');
  const [directorPassword, setDirectorPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [user, setUser] = useState(null);
  const [loggedInTeamId, setLoggedInTeamId] = useState(null);
  const [playerTab, setPlayerTab] = useState('matches');
  
  const [activeTab, setActiveTab] = useState('registration');
  const [resultsFilter, setResultsFilter] = useState('pending'); 
  
  const [categories, setCategories] = useState({ U50: 'Herren unter 50', O50: 'Herren über 50' });
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState({ U50: {}, O50: {} });
  const [matches, setMatches] = useState([]);
  const [brackets, setBrackets] = useState({ U50: null, O50: null });
  
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [day1Start, setDay1Start] = useState('09:30');
  const [day2Start, setDay2Start] = useState('09:30');
  const [tournamentDays, setTournamentDays] = useState(2);
  const [isolateGrandFinals, setIsolateGrandFinals] = useState(true);
  const [matchDuration, setMatchDuration] = useState(90);

  const [regForm, setRegForm] = useState({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });
  const [editingTeam, setEditingTeam] = useState(null);
  const [scoreModal, setScoreModal] = useState(null);
  const [koConfig, setKoConfig] = useState(null); 
  const [schedulePrompt, setSchedulePrompt] = useState(false);
  
  const [printView, setPrintView] = useState('normal');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const [simState, setSimState] = useState('idle');
  const [koQualifyCount, setKoQualifyCount] = useState(2);
  
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [monitorSlides, setMonitorSlides] = useState([]);
  const [monitorSlideIdx, setMonitorSlideIdx] = useState(0);

  const matchCodeMap = useMemo(() => {
     const map = {};
     const sched = [...matches].filter(m => m.time && m.time !== 'Flexibel' && m.time !== 'BYE').sort((a,b) => {
         if (a.day !== b.day) return a.day - b.day;
         if (a.time !== b.time) return a.time.localeCompare(b.time);
         return (a.court || 0) - (b.court || 0);
     });
     sched.forEach((m, idx) => {
         map[m.id] = `M-${String(idx + 1).padStart(3, '0')}`;
     });
     return map;
  }, [matches]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin');
    
    if (urlPin && teams.length > 0 && appMode === 'login') {
      const foundTeam = teams.find(t => t.pin === urlPin);
      if (foundTeam) {
        setAppMode('player');
        setLoggedInTeamId(foundTeam.id);
        setAuthError('');
      }
    }
  }, [teams, appMode]);

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
        if (liveData.categories) setCategories(prev => ({ ...prev, ...liveData.categories }));
        if (liveData.teams) setTeams(liveData.teams);
        if (liveData.groups) setGroups(liveData.groups);
        if (liveData.matches) setMatches(liveData.matches);
        if (liveData.brackets) setBrackets(liveData.brackets);
        if (liveData.startDate) setStartDate(liveData.startDate);
        if (liveData.day1Start) setDay1Start(liveData.day1Start);
        if (liveData.day2Start) setDay2Start(liveData.day2Start);
        if (liveData.tournamentDays) setTournamentDays(liveData.tournamentDays);
        if (liveData.isolateGrandFinals !== undefined) setIsolateGrandFinals(liveData.isolateGrandFinals);
        if (liveData.matchDuration !== undefined) setMatchDuration(liveData.matchDuration);
      }
    });
    return () => unsubscribe();
  }, [user, appId, appMode]);

  useEffect(() => {
    const syncToCloud = async () => {
      if ((appMode === 'organizer' || appMode === 'director') && user) {
        try {
          const tournamentDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournament', 'mainState');
          await setDoc(tournamentDocRef, { teams, groups, matches, brackets, startDate, day1Start, day2Start, tournamentDays, isolateGrandFinals, matchDuration, categories, lastUpdated: new Date().toISOString() });
        } catch (error) { console.error("Failed to push updates to live server:", error); }
      }
    };
    const timeoutId = setTimeout(syncToCloud, 800);
    return () => clearTimeout(timeoutId);
  }, [teams, groups, matches, brackets, startDate, day1Start, day2Start, tournamentDays, isolateGrandFinals, matchDuration, categories, appMode, user, appId]);

  useEffect(() => {
    if (appMode === 'monitor') {
      const clockInt = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false })), 1000);
      return () => clearInterval(clockInt);
    }
  }, [appMode]);

  const standings = useMemo(() => {
    const stats = {};
    teams.forEach(t => { stats[t.id] = { ...t, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0 }; });

    matches.filter(m => m.stage === 'Group' && m.score).forEach(m => {
      const { s1, s2, tb } = m.score;
      const t1 = m.team1 ? stats[m.team1.id] : null; 
      const t2 = m.team2 ? stats[m.team2.id] : null;
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
      const getWinner = (id) => { const m = matches.find(x => x.id === id); return m?.winnerId ? (m.winnerId === m.team1?.id ? m.team1 : m.team2) : null; };
      const getLoser = (id) => { const m = matches.find(x => x.id === id); return m?.winnerId ? (m.winnerId === m.team1?.id ? m.team2 : m.team1) : null; };

      const top8 = [
        getWinner(`final_${cat}`), getLoser(`final_${cat}`),
        getWinner(`place_3_${cat}`), getLoser(`place_3_${cat}`),
        getWinner(`place_5_${cat}`), getLoser(`place_5_${cat}`),
        getWinner(`place_7_${cat}`), getLoser(`place_7_${cat}`)
      ];

      top8.forEach((team, idx) => {
         if (team && !team.isBye) ranks[cat].push({ rank: idx + 1, team });
      });

      const placedIds = ranks[cat].map(r => r.team?.id).filter(id => id);
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
    if (appMode !== 'monitor') return;
    let newSlides = [];
    
    const checkFinalStatus = (cat) => {
        if (!brackets || !brackets[cat]) return false;
        const finalMatchId = brackets[cat].finals[0].id;
        const finalMatch = matches.find(m => m.id === finalMatchId);
        return finalMatch && finalMatch.winnerId !== null;
    };
    
    const u50Ended = checkFinalStatus('U50');
    const o50Ended = checkFinalStatus('O50');
    const allEnded = (brackets?.U50 ? u50Ended : true) && (brackets?.O50 ? o50Ended : true) && (brackets?.U50 || brackets?.O50);
    const hasBrackets = brackets && (brackets.U50 || brackets.O50);

    if (!allEnded) {
        ['U50', 'O50'].forEach(cat => {
            const grps = Object.entries(groups[cat] || {}).sort((a,b) => a[0].localeCompare(b[0]));
            if (grps.length > 0) {
               for(let i=0; i<grps.length; i+=4) {
                   newSlides.push({ type: 'groups', cat, title: `Gruppen ${categories[cat]}`, data: grps.slice(i, i+4), pageInfo: grps.length>4 ? `(Teil ${Math.floor(i/4)+1}/${Math.ceil(grps.length/4)})` : '' });
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
                newSlides.push({ type: 'bracket_main', cat, title: `K.O.-Baum: ${categories[cat]}` });
                newSlides.push({ type: 'bracket_placement', cat, title: `Platzierungsspiele: ${categories[cat]}` });
            }
        });
    }

    ['U50', 'O50'].forEach(cat => {
        const isEnded = checkFinalStatus(cat);
        if (isEnded) {
            const ranks = finalRankings[cat] || [];
            if (ranks.length > 0) {
                for(let i=0; i<ranks.length; i+=12) {
                    newSlides.push({ type: 'rankings', cat, title: `Abschlussplatzierungen: ${categories[cat]}`, data: ranks.slice(i, i+12), pageInfo: ranks.length>12 ? `(Plätze ${i+1}-${Math.min(i+12, ranks.length)})` : '' });
                }
            }
        }
    });

    if (newSlides.length === 0) newSlides.push({ type: 'idle', title: 'Willkommen beim Turnier' });

    setMonitorSlides(newSlides);
    if (monitorSlideIdx >= newSlides.length) setMonitorSlideIdx(0);
  }, [appMode, matches, groups, brackets, finalRankings, categories]);

  useEffect(() => {
    if (appMode === 'monitor' && monitorSlides.length > 0) {
      const rotateInt = setInterval(() => {
        setMonitorSlideIdx(prev => (prev + 1) % monitorSlides.length);
      }, 15000); 
      return () => clearInterval(rotateInt);
    }
  }, [appMode, monitorSlides]);

  const handleLogin = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (params.get('pin') && !passwordInput) return;

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

  const handleDirectorLogin = (e) => {
    e.preventDefault();
    if (directorPassword === 'wannweil' || directorPassword === 'erfassung') {
        setAppMode('director');
        setDirectorPassword('');
        setAuthError('');
    } else {
        setAuthError('Falsches Passwort für Turnierleitung.');
    }
  };

  const handleMonitorLogin = (e) => {
    e.preventDefault();
    if (monitorPassword === 'wannweil' || monitorPassword === 'monitor') {
      setAppMode('monitor');
      setMonitorPassword('');
      setAuthError('');
    } else {
      setAuthError('Falsches Monitor-Passwort.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('tennis_auth');
    setPasswordInput('');
    setMonitorPassword('');
    setDirectorPassword('');
    const url = new URL(window.location);
    if (url.searchParams.has('pin')) {
      url.searchParams.delete('pin');
      window.history.replaceState({}, '', url);
    }
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
    const dataStr = JSON.stringify({ teams, groups, matches, brackets, startDate, day1Start, day2Start, tournamentDays, isolateGrandFinals, matchDuration, categories });
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
           if (data.categories) setCategories(data.categories);
           if (data.teams) setTeams(data.teams);
           if (data.groups) setGroups(data.groups);
           if (data.matches) setMatches(data.matches);
           if (data.brackets) setBrackets(data.brackets);
           if (data.startDate) setStartDate(data.startDate);
           if (data.day1Start) setDay1Start(data.day1Start);
           if (data.day2Start) setDay2Start(data.day2Start);
           if (data.tournamentDays) setTournamentDays(data.tournamentDays);
           if (data.isolateGrandFinals !== undefined) setIsolateGrandFinals(data.isolateGrandFinals);
           if (data.matchDuration !== undefined) setMatchDuration(data.matchDuration);
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

  const handleExportTeams = () => {
    const dataStr = JSON.stringify(teams, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teilnehmerliste_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTeams = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
            setTeams(data);
            setGroups({ U50: {}, O50: {} });
            setMatches([]);
            setBrackets({ U50: null, O50: null });
        } else {
            setAuthError('Fehler: Die Datei enthält keine gültige Teilnehmerliste.');
            setTimeout(() => setAuthError(''), 4000);
        }
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
      const timeSlotSpacing = matchDuration + 15; 
      const timeSlots = generateTimeSlots(day1Start, 16, timeSlotSpacing);
      
      ['U50', 'O50'].forEach(cat => {
        if (!groups[cat]) return;
        Object.entries(groups[cat]).forEach(([groupName, groupTeams]) => {
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              newMatches.push({ id: generateId(), day: 1, time: null, endTime: null, court: null, category: cat, stage: 'Group', groupName, team1: groupTeams[i], team2: groupTeams[j], score: null, winnerId: null });
            }
          }
        });
      });
      const scheduleState = {};
      timeSlots.forEach(time => scheduleState[time] = { courtsUsed: 0, playingTeams: new Set() });
      newMatches.forEach(match => {
        for (const time of timeSlots) {
          const slot = scheduleState[time];
          if (slot.courtsUsed < COURTS && !slot.playingTeams.has(match.team1?.id) && !slot.playingTeams.has(match.team2?.id)) {
             match.time = time; match.endTime = addMinutes(time, matchDuration); match.court = slot.courtsUsed + 1;
             slot.courtsUsed++; slot.playingTeams.add(match.team1?.id); slot.playingTeams.add(match.team2?.id); break;
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
            for (let j = i + 1; j < groupTeams.length; j++) { pairs.push({ t1: groupTeams[i], t2: groupTeams[j] }); }
          }
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
            lastPlayed[selected.t1.id] = orderedPairs.length - 1;
            lastPlayed[selected.t2.id] = orderedPairs.length - 1;
          }
          orderedPairs.forEach((p, idx) => {
            newMatches.push({ id: generateId(), day: 1, time: 'Flexibel', endTime: null, court: courtNum, category: cat, stage: 'Group', groupName, team1: p.t1, team2: p.t2, score: null, winnerId: null, matchOrder: idx + 1 });
          });
          gIdx++;
        });
      });
    }

    const koMatches = matches.filter(m => m.stage !== 'Group');
    setMatches([...newMatches, ...koMatches]);
    setSchedulePrompt(false);
    if (simState === 'idle') setActiveTab('schedule');
  };

  const fillMissingScores = (stageFilter = '', groupFilter = '') => {
    setMatches(prev => prev.map(m => {
      const isStageMatch = stageFilter === '' || m.stage === stageFilter || (stageFilter === 'Placement' && m.stage === 'Placement');
      const formattedGN = formatStageGroupName(m.stage, m.groupName);
      const isGroupMatch = groupFilter === '' || formattedGN.includes(groupFilter);

      if (m.score || !m.team1 || !m.team2 || m.team1.isBye || m.team2.isBye || !isStageMatch || !isGroupMatch) return m;
      
      const randomData = generateRandomScore();
      return { ...m, score: { s1: randomData.s1, s2: randomData.s2, tb: randomData.tb }, winnerId: randomData.winnerIdx === 1 ? m.team1?.id : m.team2?.id };
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
      const winnerId = t1Sets > t2Sets ? m.team1?.id : (t2Sets > t1Sets ? m.team2?.id : null);
      return { ...m, score: { s1, s2, tb }, winnerId };
    }));
    setScoreModal(null);
  };

  const handleKoGeneration = () => {
    let needsWildcard = false;
    ['U50', 'O50'].forEach(cat => {
      if (!groups[cat]) return;
      const groupCount = Object.keys(groups[cat]).length;
      if (groupCount > 0 && groupCount * koQualifyCount < 8) needsWildcard = true;
    });

    if (simState === 'idle') {
       setKoConfig({ active: true, needsWildcard });
    } else {
       generateKO(2, true, tournamentDays === 1 ? 1 : 2);
    }
  };

  const handleKoSubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const qfDay = tournamentDays === 1 ? 1 : parseInt(fd.get('qfDay') || '2', 10);
      const useWildcards = koConfig.needsWildcard ? (fd.get('wildcards') === 'true') : false;
      
      generateKO(2, useWildcards, qfDay);
      setKoConfig(null);
  };

  const generateKO = (qualCount, useWildcards = false, qfDay = 2) => {
    setKoQualifyCount(qualCount);
    const newBrackets = { U50: null, O50: null };
    let newMatches = [...matches.filter(m => m.stage === 'Group')];
    
    const sfDay = tournamentDays;
    
    let day1AvailableStart = day1Start;
    const day1GroupMatches = newMatches.filter(m => m.day === 1 && m.endTime);
    if (day1GroupMatches.length > 0) {
        const latestEndMins = Math.max(...day1GroupMatches.map(m => timeToMins(m.endTime)));
        day1AvailableStart = addMinutes(`${Math.floor(latestEndMins/60).toString().padStart(2,'0')}:${(latestEndMins%60).toString().padStart(2,'0')}`, 15);
    }
    
    const timeSlotSpacing = matchDuration + 15;
    const d1Slots = generateTimeSlots(day1AvailableStart, 16, timeSlotSpacing);
    const d2Slots = generateTimeSlots(day2Start, 16, timeSlotSpacing);
    
    const qfTargetSlots = qfDay === 1 ? d1Slots : d2Slots;
    const sfTargetSlots = sfDay === 1 ? d1Slots : d2Slots;
    
    const slotUsage = { 1: {}, 2: {} };
    d1Slots.forEach(t => slotUsage[1][t] = 0);
    d2Slots.forEach(t => slotUsage[2][t] = 0);

    const allQFs = [];
    const allSFs = [];
    const allPlacements = [];
    const allGrandFinals = [];

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
        { id: `final_${cat}`, title: 'Finale', team1: null, team2: null },
        { id: `place_3_${cat}`, title: 'Platzierungsspiel, Platz 3', team1: null, team2: null },
        { id: `place_5_${cat}`, title: 'Platzierungsspiel, Platz 5', team1: null, team2: null },
        { id: `place_7_${cat}`, title: 'Platzierungsspiel, Platz 7', team1: null, team2: null }
      ];

      qfNodes.forEach(node => {
        if (!node.team1.isBye && !node.team2.isBye) {
           allQFs.push({ id: node.id, category: cat, stage: 'KO', groupName: 'Viertelfinale', team1: node.team1, team2: node.team2, score: null, winnerId: null, nextMatchId: node.next, nextLoserId: node.nextLoser, day: qfDay });
        }
      });
      [...sfNodes, ...pSfNodes].forEach(node => {
         allSFs.push({ id: node.id, category: cat, stage: node.id.includes('place') ? 'Placement' : 'KO', groupName: node.title, team1: null, team2: null, score: null, winnerId: null, nextMatchId: node.next, nextLoserId: node.nextLoser, day: sfDay });
      });
      finalNodes.forEach(node => {
         const match = { id: node.id, category: cat, stage: node.id.includes('place') ? 'Placement' : 'KO', groupName: node.title, team1: null, team2: null, score: null, winnerId: null, day: sfDay };
         if (node.id.includes('final_')) allGrandFinals.push(match);
         else allPlacements.push(match);
      });

      newBrackets[cat] = { qf: qfNodes, sf: sfNodes, pSf: pSfNodes, finals: finalNodes };
    });

    const scheduleBatch = (batch, targetDay, slotsArr, startIdx) => {
        if (batch.length === 0) return startIdx;
        let maxSlotUsed = startIdx;
        
        batch.forEach(match => {
            match.day = targetDay;
            let assigned = false;
            for (let i = startIdx; i < slotsArr.length; i++) {
                const time = slotsArr[i];
                if (slotUsage[targetDay][time] < COURTS) {
                    slotUsage[targetDay][time]++;
                    match.time = time;
                    match.endTime = addMinutes(time, matchDuration);
                    match.court = slotUsage[targetDay][time]; 
                    if (i > maxSlotUsed) maxSlotUsed = i;
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                const lastTime = slotsArr[slotsArr.length - 1];
                match.time = lastTime;
                match.endTime = addMinutes(lastTime, matchDuration);
                match.court = Math.floor(Math.random() * COURTS) + 1;
            }
        });
        return maxSlotUsed + 1;
    };

    let currentQfSlotIdx = scheduleBatch(allQFs, qfDay, qfTargetSlots, 0);
    let currentSfSlotIdx = qfDay === sfDay ? currentQfSlotIdx : 0;
    
    currentSfSlotIdx = scheduleBatch(allSFs, sfDay, sfTargetSlots, currentSfSlotIdx);
    
    if (isolateGrandFinals) {
        currentSfSlotIdx = scheduleBatch(allPlacements, sfDay, sfTargetSlots, currentSfSlotIdx);
        currentSfSlotIdx = scheduleBatch(allGrandFinals, sfDay, sfTargetSlots, currentSfSlotIdx);
    } else {
        currentSfSlotIdx = scheduleBatch([...allPlacements, ...allGrandFinals], sfDay, sfTargetSlots, currentSfSlotIdx);
    }

    setBrackets(newBrackets);
    setMatches([...newMatches, ...allQFs, ...allSFs, ...allPlacements, ...allGrandFinals]);
  };

  useEffect(() => {
    if (!brackets.U50 && !brackets.O50) return;
    let updatedMatches = [...matches];
    let changesMade = false;

    const pushToNode = (matchId, team) => {
       if (!matchId || !team) return;
       let targetMatch = updatedMatches.find(m => m.id === matchId);
       if (targetMatch && !targetMatch.team1) { targetMatch.team1 = team; changesMade = true; }
       else if (targetMatch && !targetMatch.team2 && targetMatch.team1?.id !== team.id) { targetMatch.team2 = team; changesMade = true; }
    };

    matches.filter(m => (m.stage === 'KO' || m.stage === 'Placement') && m.winnerId).forEach(m => {
       const winner = m.winnerId === m.team1?.id ? m.team1 : m.team2;
       const loser = m.winnerId === m.team1?.id ? m.team2 : m.team1;
       pushToNode(m.nextMatchId, winner);
       pushToNode(m.nextLoserId, loser);
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
          handleKoGeneration(); 
          setActiveTab('bracket'); 
          setSimState('ko_qf_scores'); 
          break;
        case 'ko_qf_scores': fillMissingScores('KO', 'Viertelfinale'); setSimState('ko_sf_scores'); break;
        case 'ko_sf_scores': fillMissingScores('KO', 'Halbfinale'); fillMissingScores('Placement', 'Platzierungsspiel, 5-8'); setSimState('ko_final_scores'); break;
        case 'ko_final_scores': fillMissingScores('KO', 'Finale'); fillMissingScores('Placement', 'Platzierungsspiel'); setSimState('idle'); break;
        default: setSimState('idle');
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [simState]);

  const renderScore = (score) => {
    if (!score) return <span className="text-[var(--contrast-3)]">vs</span>;
    return (
      <span className="font-bold text-[var(--contrast)] inline-flex flex-wrap justify-center items-center gap-x-1 gap-y-0.5">
        <span className="whitespace-nowrap">{score.s1?.[0] ?? '-'}:{score.s1?.[1] ?? '-'}</span>
        <span className="text-[var(--contrast-3)] font-normal">|</span>
        <span className="whitespace-nowrap">{score.s2?.[0] ?? '-'}:{score.s2?.[1] ?? '-'}</span>
        {score.tb && (score.tb[0] > 0 || score.tb[1] > 0) && (
          <>
            <span className="text-[var(--contrast-3)] font-normal">|</span>
            <span className="whitespace-nowrap text-[var(--tcw-orange)]">[{score.tb[0]}:{score.tb[1]}]</span>
          </>
        )}
      </span>
    );
  };

  const groupMatches = matches.filter(m => m.stage === 'Group');
  const unplayedGroupCount = groupMatches.filter(m => !m.winnerId).length;
  const canGenerateKO = matches.length > 0 && groupMatches.length > 0 && unplayedGroupCount === 0;

  if (appMode === 'login') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pin') && teams.length === 0) {
       return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--base-2)]">
            <GlobalStyles />
            <div className="flex flex-col items-center animate-pulse">
               <Loader2 className="animate-spin text-[var(--tcw-green)] mb-4" size={48} />
               <p className="text-[var(--contrast-2)] font-bold">Auto-Login via QR-Code läuft...</p>
            </div>
          </div>
       );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[var(--base-2)]">
        <GlobalStyles />
        <div className="absolute inset-0 z-0 opacity-10" style={{backgroundImage: `url(${BRAND.banner})`, backgroundSize: 'cover'}}></div>
        
        <div className="h-32 w-32 flex items-center justify-center mb-8 drop-shadow-md relative z-10">
            <img src={BRAND.logo} alt="Logo" className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch justify-center">
          
          <div className="p-8 rounded-xl shadow-xl w-full border border-[var(--contrast-3)] relative overflow-hidden bg-[var(--base-3)] flex flex-col justify-between">
            {authError && !authError.includes('Monitor') && !authError.includes('Turnierleitung') && <div className="absolute top-0 left-0 w-full bg-[var(--tcw-orange)] text-[var(--base-3)] text-xs font-bold text-center py-2 animate-in slide-in-from-top">{authError}</div>}
            <div>
                <Lock className="h-10 w-10 text-[var(--tcw-green)] mx-auto mb-4" />
                <h2 className="heading-font text-xl font-extrabold text-center text-[var(--contrast)] mb-2">Veranstalter & Team</h2>
                <p className="text-center text-[var(--contrast-2)] text-sm mb-6 font-medium">Turnierplanung oder privater Team-Zugang.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-3 border border-[var(--contrast-3)] rounded text-center tracking-widest font-bold focus:border-[var(--tcw-green)] focus:outline-none transition bg-[var(--base-2)] text-[var(--contrast)]" placeholder="Passwort oder PIN" required />
              <button type="submit" className="w-full bg-[var(--tcw-green)] text-[var(--base-3)] p-3 rounded font-bold hover:bg-[var(--tcw-green-dark)] shadow-md transition">Anmelden</button>
            </form>
          </div>

          <div className="p-8 rounded-xl shadow-xl w-full border border-[var(--tcw-green-dark)] relative overflow-hidden bg-[var(--tcw-green)] text-[var(--base-3)] flex flex-col justify-between transform md:scale-105 z-10">
            {authError && authError.includes('Turnierleitung') && <div className="absolute top-0 left-0 w-full bg-[var(--tcw-orange)] text-[var(--base-3)] text-xs font-bold text-center py-2 animate-in slide-in-from-top">{authError}</div>}
            <div>
                <CheckSquare className="h-10 w-10 text-[var(--base-3)] mx-auto mb-4" />
                <h2 className="heading-font text-xl font-extrabold text-center mb-2">Turnierleitung</h2>
                <p className="text-center text-[var(--base)] text-sm mb-6 font-medium">Mobile Ergebniserfassung für Tablets & Smartphones.</p>
            </div>
            <form onSubmit={handleDirectorLogin} className="space-y-4">
              <input type="password" value={directorPassword} onChange={(e) => setDirectorPassword(e.target.value)} className="w-full p-3 border border-[var(--tcw-green-dark)] rounded text-center tracking-widest font-bold focus:border-[var(--base-3)] focus:outline-none transition bg-[var(--tcw-green-dark)] text-[var(--base-3)] placeholder:text-[var(--base-3)] placeholder:opacity-70" placeholder="Leiter-Passwort" required />
              <button type="submit" className="w-full bg-[var(--base-3)] text-[var(--tcw-green-dark)] p-3 rounded font-bold hover:bg-[var(--base)] shadow-lg flex items-center justify-center transition">
                <FileSignature size={20} className="mr-2" /> Erfassung starten
              </button>
            </form>
          </div>

          <div className="bg-[var(--contrast)] p-8 rounded-xl shadow-xl w-full border border-[var(--contrast-2)] text-center relative overflow-hidden flex flex-col justify-between">
             {authError && authError.includes('Monitor') && <div className="absolute top-0 left-0 w-full bg-[var(--tcw-orange)] text-[var(--base-3)] text-xs font-bold text-center py-2 animate-in slide-in-from-top">{authError}</div>}
             <div>
                 <Tv className="h-10 w-10 text-[var(--tcw-green-light)] mx-auto mb-4" />
                 <h3 className="heading-font font-bold text-[var(--base-3)] text-xl mb-2">TV-Monitor Anzeige</h3>
                 <p className="text-sm text-[var(--contrast-3)] mb-6 font-medium">Starten Sie das Live-Dashboard.</p>
             </div>
             <form onSubmit={handleMonitorLogin} className="space-y-4">
               <input type="password" value={monitorPassword} onChange={(e) => setMonitorPassword(e.target.value)} className="w-full p-3 border border-[var(--contrast-2)] rounded text-center tracking-widest font-bold focus:border-[var(--tcw-green-light)] focus:outline-none transition bg-[var(--contrast-2)] text-[var(--base-3)] placeholder:text-[var(--contrast-3)]" placeholder="Monitor-Passwort" required />
               <button type="submit" className="w-full bg-[var(--contrast-2)] text-[var(--base-3)] p-3 rounded font-bold hover:bg-[var(--contrast-3)] shadow-md flex items-center justify-center border border-[var(--contrast-3)] transition">
                 <Monitor size={20} className="mr-2" /> Monitor starten
               </button>
             </form>
          </div>

        </div>
      </div>
    );
  }

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
      if(a.day !== b.day) return a.day - b.day; return (a.time||'').localeCompare(b.time||'');
    });

    return (
      <div className="bg-[var(--contrast)] min-h-screen flex justify-center">
        <GlobalStyles />
        <div className="w-full max-w-[400px] bg-[var(--base-2)] min-h-screen flex flex-col relative">
          <header className="relative bg-[var(--tcw-green)] text-[var(--base-3)] pt-10 pb-6 px-5 rounded-b shadow-md z-10">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="h-16 w-16 flex items-center justify-center drop-shadow-md">
                   <img src={BRAND.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <button onClick={handleLogout} className="text-[var(--base-3)] p-2 bg-[var(--tcw-green-dark)] rounded hover:bg-[var(--contrast)] transition">
                  <LogOut size={20} />
                </button>
              </div>
              <h1 className="heading-font text-2xl font-bold leading-tight mb-1">{myTeam.name}</h1>
              <div className="flex items-center space-x-2 text-[var(--base)] text-sm font-medium">
                 <span>{categories[myTeam.category]}</span> <span>•</span>
                 <span className="truncate">{myTeam.clubs.join(' / ')}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-5 pb-24">
            {playerTab === 'matches' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="heading-font text-lg font-bold text-[var(--contrast)] flex items-center"><Calendar className="mr-2 text-[var(--tcw-green)]" size={20}/> Mein Spielplan</h2>
                {scheduledMatches.length === 0 ? (
                  <div className="bg-[var(--base-3)] p-6 rounded text-center shadow-sm border border-[var(--base)] text-[var(--contrast-2)] font-medium">Noch keine Spiele geplant.</div>
                ) : (
                  scheduledMatches.map(m => {
                    const isWinner = m.winnerId === myTeam.id; 
                    const isLoser = m.winnerId && m.winnerId !== myTeam.id;
                    const opp = (m.team1 && m.team1.id === myTeam.id) ? m.team2 : m.team1;
                    const oppName = opp ? (opp.isBye ? 'Freilos' : opp.name) : 'Noch offen';

                    return (
                      <div key={m.id} className={`bg-[var(--base-3)] rounded p-4 shadow-sm border-l-4 ${isWinner ? 'border-l-[var(--tcw-green)]' : isLoser ? 'border-l-[var(--tcw-orange)]' : 'border-l-[var(--contrast-3)]'}`}>
                        <div className="flex justify-between items-center text-xs font-bold text-[var(--contrast-2)] uppercase tracking-wider mb-3 pb-2 border-b border-[var(--base)]">
                          <span>{getFormattedDate(startDate, m.day - 1)} • {m.time} {m.endTime ? `- ${m.endTime}`:''} • Platz {m.court}</span>
                          <span className="text-[var(--tcw-green-dark)] bg-[var(--base-2)] px-2 py-0.5 rounded">{formatStageGroupName(m.stage, m.groupName)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="text-xs text-[var(--contrast-3)] mb-1 font-medium">Gegner</div>
                            <div className="font-bold text-[var(--contrast)] text-sm">{oppName}</div>
                          </div>
                          <div className="text-right pl-4">
                            {m.score ? (
                               <div className={`font-black text-lg ${isWinner ? 'text-[var(--tcw-green)]' : 'text-[var(--tcw-orange)]'}`}>
                                  {m.score.s1?.[0] ?? '-'}:{m.score.s1?.[1] ?? '-'} <br/> {m.score.s2?.[0] ?? '-'}:{m.score.s2?.[1] ?? '-'}
                                  {m.score.tb && (m.score.tb[0] > 0 || m.score.tb[1] > 0) && <span><br/>[{m.score.tb[0]}:{m.score.tb[1]}]</span>}
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
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="heading-font text-lg font-bold text-[var(--contrast)] flex items-center"><Shield className="mr-2 text-[var(--tcw-green)]" size={20}/> {myGroupName}</h2>
                <div className="bg-[var(--base-3)] rounded shadow-sm border border-[var(--base)] overflow-hidden">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-[var(--base-2)] text-[var(--contrast-2)] text-xs uppercase">
                       <tr><th className="p-3">Pos</th><th className="p-3">Team</th><th className="p-3 text-center">S-N</th></tr>
                     </thead>
                     <tbody className="divide-y divide-[var(--base)]">
                       {myGroupTeams.map((t, idx) => (
                         <tr key={t.id} className={`${t.id === myTeam.id ? 'bg-[var(--base)]' : ''}`}>
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
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="heading-font text-lg font-bold text-[var(--contrast)] flex items-center"><Award className="mr-2 text-[var(--tcw-yellow)]" size={20}/> Rangliste</h2>
                {(() => {
                  const finalMatchId = brackets[myTeam.category]?.finals?.[0]?.id;
                  const finalMatch = matches.find(m => m.id === finalMatchId);
                  const isEnded = finalMatch && finalMatch.winnerId !== null;

                  if (!isEnded) {
                    return (
                      <div className="bg-[var(--base-3)] p-6 rounded text-center shadow-sm border border-[var(--base)] text-[var(--contrast-2)] font-medium">
                        Die endgültige Rangliste für {categories[myTeam.category]} wird nach Abschluss des Finales veröffentlicht.
                      </div>
                    );
                  }

                  const myRanks = finalRankings[myTeam.category];
                  if (!myRanks || myRanks.length === 0) {
                    return (<div className="bg-[var(--base-3)] p-6 rounded text-center shadow-sm border border-[var(--base)] text-[var(--contrast-2)] font-medium">Warte auf K.O.-Phase...</div>);
                  }

                  return (
                    <div className="bg-[var(--base-3)] rounded shadow-sm border border-[var(--base)] overflow-hidden divide-y divide-[var(--base)]">
                      {myRanks.map((item, idx) => (
                         <div key={item.team?.id} className={`flex items-center p-3 ${item.team?.id === myTeam.id ? 'bg-[var(--base)] border-l-4 border-l-[var(--tcw-green)]' : ''}`}>
                           <div className="w-8 text-center font-extrabold text-[var(--contrast-3)]">{idx===0?'🏆':item.rank}</div>
                           <div className={`flex-1 pl-3 truncate ${item.team?.id === myTeam.id ? 'font-bold text-[var(--tcw-green-dark)]' : 'text-[var(--contrast)] font-medium'}`}>{item.team?.name}</div>
                         </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </main>
          <nav className="absolute bottom-0 w-full bg-[var(--base-3)] border-t border-[var(--contrast-3)] flex justify-around p-3 shadow-lg">
             <button onClick={() => setPlayerTab('matches')} className={`flex flex-col items-center p-2 rounded w-20 transition-colors ${playerTab === 'matches' ? 'text-[var(--tcw-green)]' : 'text-[var(--contrast-3)] hover:text-[var(--contrast)]'}`}>
               <Calendar size={20} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Spiele</span>
             </button>
             <button onClick={() => setPlayerTab('group')} className={`flex flex-col items-center p-2 rounded w-20 transition-colors ${playerTab === 'group' ? 'text-[var(--tcw-green)]' : 'text-[var(--contrast-3)] hover:text-[var(--contrast)]'}`}>
               <Shield size={20} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Gruppe</span>
             </button>
             <button onClick={() => setPlayerTab('rankings')} className={`flex flex-col items-center p-2 rounded w-20 transition-colors ${playerTab === 'rankings' ? 'text-[var(--tcw-green)]' : 'text-[var(--contrast-3)] hover:text-[var(--contrast)]'}`}>
               <Award size={20} className="mb-1" /> <span className="text-[10px] font-bold uppercase tracking-wider">Rangliste</span>
             </button>
          </nav>
        </div>
      </div>
    );
  }

  if (appMode === 'monitor') {
    const renderMonitorScore = (score) => {
      if (!score) return <span className="text-[var(--contrast-3)] font-normal flex-1 text-center">vs</span>;
      return (
        <div className="flex justify-center items-center space-x-4 text-[var(--tcw-green-light)] w-full">
          <div className="w-8 text-center">{score.s1?.[0] ?? '-'}:{score.s1?.[1] ?? '-'}</div>
          <div className="w-8 text-center">{score.s2?.[0] ?? '-'}:{score.s2?.[1] ?? '-'}</div>
          <div className="w-12 text-center text-[var(--tcw-yellow)]">
            {score.tb && (score.tb[0] > 0 || score.tb[1] > 0) ? `[${score.tb[0]}:${score.tb[1]}]` : ''}
          </div>
        </div>
      );
    };

    const getMonitorMatchData = (id) => {
      const liveMatch = matches.find(m => m.id === id);
      if (liveMatch) return liveMatch;
      ['U50', 'O50'].forEach(cat => {
         if (brackets[cat]) {
           const allNodes = [...brackets[cat].qf, ...brackets[cat].sf, ...brackets[cat].pSf, ...brackets[cat].finals];
           const found = allNodes.find(n => n.id === id);
           if (found) return found;
         }
      });
      return null;
    };

    const OfficialMonitorMatchBox = ({ matchId, title, isFinal = false }) => {
      const match = getMonitorMatchData(matchId);
      if (!match) return <div className={`w-[400px] h-[120px] border border-[var(--contrast-3)] rounded-lg bg-[var(--contrast-2)] flex items-center justify-center text-[var(--contrast-3)] text-xl font-bold ${isFinal ? 'scale-110 shadow-2xl z-20' : 'shadow-lg z-10'}`}>Offen</div>;
      
      const t1IsBye = match.team1?.isBye; const t2IsBye = match.team2?.isBye;
      if (t1IsBye && t2IsBye) return null;

      const titleText = title || formatStageGroupName(match.stage, match.groupName);
      
      return (
         <div className={`w-[400px] bg-[var(--contrast)] rounded-lg overflow-hidden border ${isFinal ? 'border-[var(--tcw-orange)] shadow-2xl scale-110 z-20' : 'border-[var(--contrast-2)] shadow-xl z-10'}`}>
            <div className={`text-sm uppercase font-extrabold px-5 py-2 border-b border-[var(--contrast-2)] flex justify-between tracking-widest ${isFinal ? 'bg-[var(--tcw-orange)] text-[var(--base-3)]' : 'bg-[var(--contrast-2)] text-[var(--contrast-3)]'}`}>
               <span className="truncate pr-4">{titleText}</span>
               {match.time && match.time !== 'Flexibel' && <span>{match.time}</span>}
            </div>
            <div className={`flex items-stretch border-b border-[var(--contrast-2)] h-[48px] ${match.winnerId === match.team1?.id ? 'bg-[var(--contrast)]' : 'bg-[var(--contrast)]/80'}`}>
               <div className={`w-2 shrink-0 ${match.winnerId === match.team1?.id ? 'bg-[var(--tcw-green-light)]' : 'bg-transparent'}`}></div>
               <div className="flex-1 px-4 flex items-center min-w-0">
                  <span className={`text-xl truncate w-full ${t1IsBye ? 'text-[var(--tcw-orange)] italic font-medium' : (match.winnerId === match.team1?.id ? 'font-bold text-[var(--base-3)]' : 'text-[var(--base)]')}`}>
                    {t1IsBye ? 'Freilos' : (match.team1?.name || 'Offen')}
                  </span>
               </div>
               {!t1IsBye && !t2IsBye && (
                  <div className="flex border-l border-[var(--contrast-2)] divide-x divide-[var(--contrast-2)] shrink-0 bg-[var(--contrast)]">
                     <div className={`w-10 flex items-center justify-center text-xl ${match.winnerId === match.team1?.id ? 'font-bold text-[var(--tcw-green-light)]' : 'text-[var(--contrast-3)]'}`}>{match.score?.s1?.[0] ?? '-'}</div>
                     <div className={`w-10 flex items-center justify-center text-xl ${match.winnerId === match.team1?.id ? 'font-bold text-[var(--tcw-green-light)]' : 'text-[var(--contrast-3)]'}`}>{match.score?.s2?.[0] ?? '-'}</div>
                     <div className="w-12 flex items-center justify-center text-sm text-[var(--tcw-yellow)] font-bold">{match.score?.tb && match.score.tb[0] > 0 ? match.score.tb[0] : ''}</div>
                  </div>
               )}
            </div>
            <div className={`flex items-stretch h-[48px] ${match.winnerId === match.team2?.id ? 'bg-[var(--contrast)]' : 'bg-[var(--contrast)]/80'}`}>
               <div className={`w-2 shrink-0 ${match.winnerId === match.team2?.id ? 'bg-[var(--tcw-green-light)]' : 'bg-transparent'}`}></div>
               <div className="flex-1 px-4 flex items-center min-w-0">
                  <span className={`text-xl truncate w-full ${t2IsBye ? 'text-[var(--tcw-orange)] italic font-medium' : (match.winnerId === match.team2?.id ? 'font-bold text-[var(--base-3)]' : 'text-[var(--base)]')}`}>
                    {t2IsBye ? 'Freilos' : (match.team2?.name || 'Offen')}
                  </span>
               </div>
               {!t1IsBye && !t2IsBye && (
                  <div className="flex border-l border-[var(--contrast-2)] divide-x divide-[var(--contrast-2)] shrink-0 bg-[var(--contrast)]">
                     <div className={`w-10 flex items-center justify-center text-xl ${match.winnerId === match.team2?.id ? 'font-bold text-[var(--tcw-green-light)]' : 'text-[var(--contrast-3)]'}`}>{match.score?.s1?.[1] ?? '-'}</div>
                     <div className={`w-10 flex items-center justify-center text-xl ${match.winnerId === match.team2?.id ? 'font-bold text-[var(--tcw-green-light)]' : 'text-[var(--contrast-3)]'}`}>{match.score?.s2?.[1] ?? '-'}</div>
                     <div className="w-12 flex items-center justify-center text-sm text-[var(--tcw-yellow)] font-bold">{match.score?.tb && match.score.tb[1] > 0 ? match.score.tb[1] : ''}</div>
                  </div>
               )}
            </div>
         </div>
      );
    };

    const slide = monitorSlides[monitorSlideIdx] || { type: 'loading', title: 'Lade Daten...' };

    return (
      <div className="h-screen w-screen overflow-hidden bg-[var(--contrast)] text-[var(--base-3)] font-sans p-6 flex flex-col">
        <GlobalStyles />
        <header className="relative flex justify-between items-center mb-6 overflow-hidden rounded border border-[var(--contrast-2)] shrink-0 bg-[var(--contrast)]">
          <div className="relative z-10 flex w-full justify-between items-center p-5">
              <div className="flex items-center space-x-6 shrink-0">
                <div className="h-20 w-20 flex items-center justify-center drop-shadow-md">
                   <img src={BRAND.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="heading-font text-4xl font-extrabold tracking-tight text-[var(--base-3)]">{BRAND.name}</h1>
                  <div className="text-xl font-bold text-[var(--tcw-green-light)] uppercase tracking-widest mt-2 flex items-center">
                    {slide.title} <span className="text-[var(--contrast-3)] ml-3 text-lg">{slide.pageInfo}</span>
                  </div>
                </div>
              </div>

              <div className="hidden xl:flex flex-1 justify-center px-8">
                 <img src={BRAND.sponsorBanner} alt="Sponsor" className="h-16 w-auto object-contain bg-[var(--base-3)] p-2 rounded shadow-sm" />
              </div>

              <div className="flex items-center space-x-6 shrink-0">
                <button onClick={handleLogout} className="flex items-center space-x-2 text-[var(--contrast-3)] hover:text-[var(--base-3)] bg-[var(--contrast-2)] px-4 py-2 rounded transition border border-[var(--contrast-2)] text-lg">
                  <LogOut size={20} className="mr-2" /> Menü
                </button>
                <div className="text-4xl font-bold text-[var(--base-3)] flex items-center bg-[var(--contrast-2)] px-6 py-3 rounded border border-[var(--contrast-2)] min-w-[160px] justify-center">
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
                    <div key={m.id} className="bg-[var(--contrast)] rounded border border-[var(--contrast-2)] p-4">
                       <div className="text-[var(--contrast-3)] font-bold mb-3 flex justify-between text-lg border-b border-[var(--contrast-2)] pb-2">
                          <span className={`font-bold ${m.time === 'Flexibel' ? 'text-[var(--tcw-yellow)] text-sm tracking-widest' : 'text-[var(--tcw-green-light)]'}`}>
                            {getFormattedDate(startDate, m.day - 1)} • {m.time} {m.endTime ? `- ${m.endTime}`:''} • Platz {m.court}
                          </span>
                          <span className="text-[var(--contrast-3)]">{categories[m.category]?.substring(0,3)} {m.category} • {formatStageGroupName(m.stage, m.groupName)}</span>
                       </div>
                       <div className="flex justify-between items-center text-2xl px-2">
                          <span className={`whitespace-nowrap flex-1 text-right ${m.winnerId === m.team1?.id ? 'text-[var(--base-3)] font-extrabold' : 'text-[var(--contrast-3)]'}`}>{m.team1?.name || 'Offen'}</span>
                          <span className="mx-6 bg-[var(--contrast-2)] py-2 px-4 rounded font-bold tracking-widest flex justify-center min-w-[160px]">
                            {renderMonitorScore(m.score)}
                          </span>
                          <span className={`whitespace-nowrap flex-1 text-left ${m.winnerId === m.team2?.id ? 'text-[var(--base-3)] font-extrabold' : 'text-[var(--contrast-3)]'}`}>{m.team2?.name || 'Offen'}</span>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="flex flex-col space-y-4">
                 {(slide.data || []).slice(5, 10).map(m => (
                    <div key={m.id} className="bg-[var(--contrast)] rounded border border-[var(--contrast-2)] p-4">
                       <div className="text-[var(--contrast-3)] font-bold mb-3 flex justify-between text-lg border-b border-[var(--contrast-2)] pb-2">
                          <span className={`font-bold ${m.time === 'Flexibel' ? 'text-[var(--tcw-yellow)] text-sm tracking-widest' : 'text-[var(--tcw-green-light)]'}`}>
                            {getFormattedDate(startDate, m.day - 1)} • {m.time} {m.endTime ? `- ${m.endTime}`:''} • Platz {m.court}
                          </span>
                          <span className="text-[var(--contrast-3)]">{categories[m.category]?.substring(0,3)} {m.category} • {formatStageGroupName(m.stage, m.groupName)}</span>
                       </div>
                       <div className="flex justify-between items-center text-2xl px-2">
                          <span className={`whitespace-nowrap flex-1 text-right ${m.winnerId === m.team1?.id ? 'text-[var(--base-3)] font-extrabold' : 'text-[var(--contrast-3)]'}`}>{m.team1?.name || 'Offen'}</span>
                          <span className="mx-6 bg-[var(--contrast-2)] py-2 px-4 rounded font-bold tracking-widest flex justify-center min-w-[160px]">
                            {renderMonitorScore(m.score)}
                          </span>
                          <span className={`whitespace-nowrap flex-1 text-left ${m.winnerId === m.team2?.id ? 'text-[var(--base-3)] font-extrabold' : 'text-[var(--contrast-3)]'}`}>{m.team2?.name || 'Offen'}</span>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          )}

          {slide.type === 'groups' && (
             <div className="grid grid-cols-2 gap-6 h-full content-start">
               {(slide.data || []).map(([groupName, groupTeams]) => (
                 <div key={groupName} className="bg-[var(--contrast)] rounded border border-[var(--contrast-2)] overflow-hidden">
                   <div className="bg-[var(--contrast-2)] p-3 text-2xl font-bold text-center text-[var(--base-3)] tracking-widest">{groupName}</div>
                   <table className="w-full text-xl">
                     <thead className="bg-[var(--contrast)] text-[var(--contrast-3)]"><tr><th className="p-3 text-left pl-6">Team</th><th className="p-3 text-center">S-N</th><th className="p-3 text-center">Sätze</th></tr></thead>
                     <tbody className="divide-y divide-[var(--contrast-2)]">
                       {(standings[slide.cat]?.[groupName] || groupTeams).map((t, idx) => (
                         <tr key={t.id}>
                           <td className="p-4 pl-6 font-medium text-[var(--base)] whitespace-nowrap flex items-center"><span className="text-[var(--contrast-3)] w-8 font-bold">{idx+1}</span> {t.name}</td>
                           <td className="p-4 text-center font-bold text-[var(--base-3)]">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                           <td className="p-4 text-center text-[var(--contrast-3)]">{t.setsWon !== undefined ? `${t.setsWon}:${t.setsLost}` : '0:0'}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ))}
             </div>
          )}

          {slide.type === 'bracket_main' && brackets[slide.cat] && (
             <div className="h-full w-full flex items-center justify-center pb-8 overflow-visible">
                 <div className="flex items-stretch h-[700px]">
                     <div className="flex flex-col justify-around z-10 h-full w-[400px]">
                        {brackets[slide.cat].qf.map((qfRef, i) => (
                            <OfficialMonitorMatchBox key={i} matchId={qfRef.id} title={`Viertelfinale ${i+1}`} />
                        ))}
                     </div>
                     <BracketConnector count={2} width="w-16" borderColor="border-[var(--contrast-2)]" />
                     <div className="flex flex-col justify-around z-10 h-full w-[400px]">
                        {brackets[slide.cat].sf.map((sfRef, i) => (
                            <OfficialMonitorMatchBox key={i} matchId={sfRef.id} title={sfRef.title} />
                        ))}
                     </div>
                     <BracketConnector count={1} width="w-16" borderColor="border-[var(--contrast-2)]" />
                     <div className="flex flex-col justify-around z-10 h-full w-[400px]">
                        <OfficialMonitorMatchBox matchId={brackets[slide.cat].finals[0].id} title="FINALE" isFinal={true} />
                     </div>
                 </div>
             </div>
          )}

          {slide.type === 'bracket_placement' && brackets[slide.cat] && (
             <div className="h-full w-full flex justify-center items-center pb-12 overflow-visible">
                 <div className="flex justify-center items-start gap-12">
                     <div className="flex flex-col space-y-12">
                        {brackets[slide.cat].pSf.map((pSfRef, i) => (
                            <OfficialMonitorMatchBox key={i} matchId={pSfRef.id} title={pSfRef.title} />
                        ))}
                     </div>
                     <div className="flex flex-col space-y-12">
                        <OfficialMonitorMatchBox matchId={brackets[slide.cat].finals[2].id} title={brackets[slide.cat].finals[2].title} />
                        <OfficialMonitorMatchBox matchId={brackets[slide.cat].finals[3].id} title={brackets[slide.cat].finals[3].title} />
                     </div>
                     <div className="flex flex-col space-y-12">
                        <OfficialMonitorMatchBox matchId={brackets[slide.cat].finals[1].id} title={brackets[slide.cat].finals[1].title} />
                     </div>
                 </div>
             </div>
          )}

          {slide.type === 'rankings' && (
             <div className="grid grid-cols-2 gap-8 h-full content-start">
                <div className="flex flex-col space-y-4">
                   {(slide.data || []).slice(0, 6).map(item => (
                      <div key={item.team?.id} className={`rounded border flex items-center p-5 shadow ${item.rank === 1 ? 'border-[var(--tcw-yellow)] bg-[var(--contrast-2)]' : 'bg-[var(--contrast)] border-[var(--contrast-2)]'}`}>
                         <div className={`text-4xl font-black w-20 text-center ${item.rank === 1 ? 'text-[var(--tcw-yellow)]' : 'text-[var(--contrast-3)]'}`}>
                            {item.rank === 1 ? '🏆' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                         </div>
                         <div className="flex-1 text-3xl font-bold text-[var(--base-3)] whitespace-nowrap pl-4 pr-2">{item.team?.name}</div>
                         <div className="text-[var(--contrast-3)] text-xl truncate max-w-[200px]">{item.team?.clubs.join(' / ')}</div>
                      </div>
                   ))}
                </div>
                <div className="flex flex-col space-y-4">
                   {(slide.data || []).slice(6, 12).map(item => (
                      <div key={item.team?.id} className="bg-[var(--contrast)] rounded border border-[var(--contrast-2)] flex items-center p-5 shadow">
                         <div className="text-4xl font-black text-[var(--contrast-3)] w-20 text-center">{item.rank}</div>
                         <div className="flex-1 text-3xl font-bold text-[var(--base-3)] whitespace-nowrap pl-4 pr-2">{item.team?.name}</div>
                         <div className="text-[var(--contrast-3)] text-xl truncate max-w-[200px]">{item.team?.clubs.join(' / ')}</div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {slide.type === 'idle' && (
             <div className="flex items-center justify-center h-full flex-col text-[var(--contrast-3)] space-y-6">
                 <Trophy size={120} className="text-[var(--contrast-2)]" />
                 <h2 className="heading-font text-4xl font-bold">Turnier startet in Kürze</h2>
                 <p className="text-xl">Die Bildschirme werden automatisch aktualisiert.</p>
             </div>
          )}
        </main>
      </div>
    );
  }

  if (appMode === 'director') {
    const timeSlotColors = [
       'bg-blue-100 border-blue-300', 'bg-green-100 border-green-300', 'bg-yellow-100 border-yellow-300', 
       'bg-purple-100 border-purple-300', 'bg-pink-100 border-pink-300', 'bg-orange-100 border-orange-300', 
       'bg-teal-100 border-teal-300', 'bg-indigo-100 border-indigo-300', 'bg-red-100 border-red-300', 'bg-cyan-100 border-cyan-300'
    ];
    
    const uniqueTimeSlots = Array.from(new Set(matches.filter(m => m.time && m.time !== 'Flexibel' && m.time !== 'BYE').map(m => `${m.day}-${m.time}`))).sort();
    
    const getTimeSlotColor = (day, time) => {
        if (!time || time === 'Flexibel' || time === 'BYE') return 'bg-[var(--base-3)] border-[var(--contrast-3)]';
        const index = uniqueTimeSlots.indexOf(`${day}-${time}`);
        if (index === -1) return 'bg-[var(--base-3)] border-[var(--contrast-3)]';
        return timeSlotColors[index % timeSlotColors.length];
    };

    return (
        <div className="bg-[var(--base-2)] min-h-screen pb-24 font-sans">
            <GlobalStyles />
            <header className="bg-[var(--tcw-green)] text-[var(--base-3)] pt-6 pb-6 px-5 shadow-md flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center space-x-4">
                    <div className="bg-[var(--base-3)] p-2 rounded-lg text-[var(--tcw-green)]">
                        <FileSignature size={28} />
                    </div>
                    <div>
                        <h1 className="heading-font text-2xl font-bold leading-none">Turnierleitung</h1>
                        <p className="text-sm font-medium opacity-90 mt-1 tracking-wider uppercase">Ergebniserfassung</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-3 bg-[var(--tcw-green-dark)] rounded-full hover:bg-[var(--contrast)] transition shadow-sm border border-[var(--tcw-green-dark)]">
                    <LogOut size={22} />
                </button>
            </header>

            <main className="p-4 md:p-6 max-w-5xl mx-auto mt-4">
                <div className="flex space-x-2 bg-[var(--base-3)] p-2 rounded-xl shadow-sm border border-[var(--contrast-3)] mb-6">
                    <button 
                        onClick={() => setResultsFilter('pending')}
                        className={`flex-1 py-3 font-bold rounded-lg transition-colors ${resultsFilter === 'pending' ? 'bg-[var(--tcw-green)] text-[var(--base-3)] shadow' : 'text-[var(--contrast-2)] hover:bg-[var(--base-2)]'}`}
                    >
                        Zu Spielen ({matches.filter(m => !m.winnerId && !m.team1?.isBye && !m.team2?.isBye && m.team1 && m.team2).length})
                    </button>
                    <button 
                        onClick={() => setResultsFilter('completed')}
                        className={`flex-1 py-3 font-bold rounded-lg transition-colors ${resultsFilter === 'completed' ? 'bg-[var(--tcw-green)] text-[var(--base-3)] shadow' : 'text-[var(--contrast-2)] hover:bg-[var(--base-2)]'}`}
                    >
                        Beendet ({matches.filter(m => m.winnerId && !m.team1?.isBye && !m.team2?.isBye && m.team1 && m.team2).length})
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matches
                        .filter(m => m.team1 && m.team2 && !m.team1.isBye && !m.team2.isBye)
                        .filter(m => resultsFilter === 'pending' ? !m.winnerId : m.winnerId)
                        .sort((a, b) => {
                            if (a.day !== b.day) return a.day - b.day;
                            if (a.time === 'Flexibel' && b.time === 'Flexibel') return (a.court || 0) - (b.court || 0);
                            if (a.time === 'Flexibel') return -1;
                            if (b.time === 'Flexibel') return 1;
                            return a.time.localeCompare(b.time);
                        })
                        .map(m => {
                            const slotColorClass = getTimeSlotColor(m.day, m.time);
                            const mCode = matchCodeMap[m.id] || 'TBA';
                            return (
                            <div 
                                key={m.id} 
                                onClick={() => setScoreModal(m)}
                                className={`rounded-xl shadow-sm border p-5 flex flex-col cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all ${slotColorClass}`}
                            >
                                <div className="flex justify-between items-start mb-4 pb-3 border-b border-[var(--contrast-2)]/20">
                                    <div className="flex flex-col">
                                        <div className="flex items-center space-x-3">
                                           <span className="text-[var(--contrast)] font-black text-xl">{m.time} Uhr</span>
                                           <span className="bg-[var(--contrast)] text-[var(--base-3)] text-xs px-2 py-1 rounded font-bold tracking-widest">{mCode}</span>
                                        </div>
                                        <span className="text-xs font-bold text-[var(--contrast-2)] mt-1">{categories[m.category]?.substring(0,3)} {m.category} • {formatStageGroupName(m.stage, m.groupName)}</span>
                                    </div>
                                    <span className="bg-[var(--base-3)] text-[var(--contrast)] px-4 py-1.5 rounded-lg font-black tracking-widest shadow-sm border border-[var(--contrast-3)]">
                                        Platz {m.court || '?'}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col space-y-3">
                                    <div className="flex justify-between items-center bg-[var(--base-3)]/70 rounded-lg p-3 border border-[var(--base-3)]">
                                        <span className={`text-lg font-bold truncate pr-4 ${m.winnerId === m.team1.id ? 'text-[var(--tcw-green-dark)]' : 'text-[var(--contrast)]'}`}>{m.team1.name}</span>
                                        {m.score && (
                                            <div className="flex space-x-2 font-black text-xl shrink-0">
                                                <span className="w-6 text-center">{m.score.s1[0]}</span>
                                                <span className="w-6 text-center">{m.score.s2[0]}</span>
                                                <span className="w-8 text-center text-[var(--tcw-orange)] text-sm pt-1">{m.score.tb && m.score.tb[0] > 0 ? `(${m.score.tb[0]})` : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center bg-[var(--base-3)]/70 rounded-lg p-3 border border-[var(--base-3)]">
                                        <span className={`text-lg font-bold truncate pr-4 ${m.winnerId === m.team2.id ? 'text-[var(--tcw-green-dark)]' : 'text-[var(--contrast)]'}`}>{m.team2.name}</span>
                                        {m.score && (
                                            <div className="flex space-x-2 font-black text-xl shrink-0">
                                                <span className="w-6 text-center">{m.score.s1[1]}</span>
                                                <span className="w-6 text-center">{m.score.s2[1]}</span>
                                                <span className="w-8 text-center text-[var(--tcw-orange)] text-sm pt-1">{m.score.tb && m.score.tb[1] > 0 ? `(${m.score.tb[1]})` : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {!m.score ? (
                                    <div className="mt-5 bg-[var(--tcw-green)] text-center text-[var(--base-3)] py-3 rounded-lg font-black text-lg flex items-center justify-center">
                                        <Edit2 size={20} className="mr-2" /> Ergebnis eintragen
                                    </div>
                                ) : (
                                    <div className="mt-5 bg-[var(--base)] border border-[var(--contrast-3)] text-center text-[var(--contrast-2)] py-3 rounded-lg font-bold text-sm flex items-center justify-center hover:bg-[var(--contrast-3)] hover:text-[var(--contrast)] transition-colors">
                                        Ergebnis korrigieren
                                    </div>
                                )}
                            </div>
                            );
                        })
                    }
                    
                    {matches.filter(m => resultsFilter === 'pending' ? !m.winnerId : m.winnerId).length === 0 && (
                        <div className="col-span-full py-12 text-center text-[var(--contrast-3)] font-bold text-xl bg-[var(--base-3)] rounded-xl border-2 border-dashed border-[var(--contrast-3)]">
                            Keine Spiele in dieser Kategorie gefunden.
                        </div>
                    )}
                </div>
            </main>

            {scoreModal && <ScoreEntryModal match={scoreModal} onClose={() => setScoreModal(null)} onSave={handleSaveScore} categories={categories} />}
        </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[var(--base-2)] text-[var(--contrast)] font-sans pb-12 relative ${printView !== 'normal' ? 'bg-[var(--base-3)]' : ''}`}>
      <GlobalStyles />
      <header className={`relative bg-[var(--tcw-green-dark)] text-[var(--base-3)] shadow-md ${printView !== 'normal' ? 'hidden' : 'print:hidden'}`}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 flex items-center justify-center">
               <img src={BRAND.logo} alt="Logo" className="w-full h-full object-contain drop-shadow" />
            </div>
            <div>
              <h1 className="heading-font text-xl font-bold hidden md:block tracking-tight">{BRAND.name}</h1>
              <div className="text-xs font-bold text-[var(--tcw-green-light)] uppercase tracking-widest hidden md:block">Turnier-Veranstalter</div>
            </div>
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            <label className="flex items-center space-x-2 bg-[var(--tcw-green)] hover:bg-[var(--contrast)] px-3 py-2 rounded cursor-pointer transition text-sm">
               <Upload size={18} /> <span className="hidden sm:inline">Laden</span>
               <input type="file" accept=".json" className="hidden" onChange={handleImportTournament} />
            </label>
            <button onClick={handleExportTournament} className="flex items-center space-x-2 bg-[var(--tcw-green)] hover:bg-[var(--contrast)] px-3 py-2 rounded transition text-sm">
               <Download size={18} /> <span className="hidden sm:inline">Speichern</span>
            </button>
            <div className="w-px bg-[var(--tcw-green-light)] mx-1 sm:mx-2 opacity-50"></div>
            
            <button onClick={handleSimulateTournament} disabled={simState !== 'idle'}
              className={`flex items-center space-x-2 px-3 py-2 rounded font-bold transition shadow-sm text-sm ${simState !== 'idle' ? 'bg-[var(--contrast-3)] cursor-not-allowed' : 'bg-[var(--tcw-orange)] hover:bg-[var(--global-color-13)] text-[var(--base-3)]'}`}
            >
              {simState !== 'idle' ? <><Loader2 size={18} className="animate-spin" /> <span className="hidden sm:inline">Simuliere...</span></> : <><FastForward size={18} /> <span className="hidden sm:inline">Simulieren</span></>}
            </button>
            <button onClick={() => window.print()} className="flex items-center space-x-2 bg-[var(--contrast-2)] hover:bg-[var(--contrast)] px-3 py-2 rounded transition text-sm">
              <Printer size={18} /> <span className="hidden sm:inline">Drucken</span>
            </button>
            <button onClick={handleLogout} className="flex items-center space-x-2 bg-[var(--contrast)] hover:bg-[var(--contrast-2)] text-[var(--base-3)] px-3 py-2 rounded transition text-sm border border-[var(--contrast-2)]">
              <LogOut size={18} /> <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${printView !== 'normal' ? 'hidden' : 'print:p-0 print:max-w-none'}`}>
        
        <div className="flex flex-wrap bg-[var(--base-3)] border border-[var(--contrast-3)] rounded mb-8 print:hidden overflow-hidden shadow-sm">
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
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 font-bold transition-all border-r border-b md:border-b-0 border-[var(--contrast-3)] last:border-r-0 ${
                activeTab === t.id ? 'bg-[var(--base)] text-[var(--tcw-green)]' : 'text-[var(--contrast-2)] hover:bg-[var(--base-2)] hover:text-[var(--contrast)]'
              }`}
            >
              <t.icon size={18} /> <span className="whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-[var(--base-3)] rounded border border-[var(--contrast-3)] print:border-none print:shadow-none print:p-0 p-6">
          
          {/* Registration Tab */}
          {activeTab === 'registration' && (
            <div className="space-y-8">
              <div className="hidden print:block mb-6 border-b-2 border-[var(--contrast)] pb-2">
                <h1 className="heading-font text-3xl font-black uppercase text-[var(--contrast)]">{BRAND.name}</h1>
                <h2 className="text-xl font-bold text-[var(--contrast-2)] mt-1">Teilnehmerliste & Anwesenheit</h2>
              </div>
              <div className="flex justify-between items-center bg-[var(--base-2)] p-6 rounded border border-[var(--base)] print:hidden">
                <div>
                  <h2 className="heading-font text-xl font-bold text-[var(--contrast)]">Turnier-Einstellungen</h2>
                  <p className="text-[var(--contrast-2)] text-sm mt-1">Teams manuell registrieren oder Testdaten laden.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                   <button onClick={() => window.print()} disabled={teams.length === 0} className="flex items-center space-x-2 bg-[var(--base-3)] text-[var(--contrast)] border border-[var(--contrast-3)] px-4 py-2 rounded hover:bg-[var(--base)] font-bold transition disabled:opacity-50">
                     <Users size={18} /> <span className="hidden md:inline">Anwesenheitsliste</span>
                   </button>
                   <button onClick={() => { setPrintView('tickets'); setTimeout(() => { window.print(); setPrintView('normal'); }, 500); }} disabled={teams.length === 0} className="flex items-center space-x-2 bg-[var(--base-3)] text-[var(--contrast)] border border-[var(--contrast-3)] px-4 py-2 rounded hover:bg-[var(--base)] font-bold transition disabled:opacity-50">
                     <QrCode size={18} /> <span className="hidden md:inline">Tickets drucken</span>
                   </button>
                   <button onClick={loadMockData} className="flex items-center space-x-2 bg-[var(--tcw-green)] text-[var(--base-3)] border border-[var(--tcw-green-dark)] px-4 py-2 rounded hover:bg-[var(--tcw-green-dark)] font-bold transition">
                     <Play size={18} /> <span className="hidden md:inline">Testdaten</span>
                   </button>
                </div>
              </div>

              <div className="bg-[var(--base-2)] p-4 rounded border border-[var(--base)] print:hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-[var(--contrast-3)]">
                   <div className="flex items-center space-x-3 col-span-1 md:col-span-1">
                     <Calendar className="text-[var(--contrast-2)]" />
                     <div className="font-bold text-[var(--contrast)]">Startdatum:</div>
                     <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border border-[var(--contrast-3)] rounded font-bold text-[var(--contrast)] bg-[var(--base-3)]" />
                   </div>
                   <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                     <Clock className="text-[var(--contrast-2)]" />
                     <div className="font-bold text-[var(--contrast)]">Turnierdauer:</div>
                     <select value={tournamentDays} onChange={(e) => setTournamentDays(Number(e.target.value))} className="p-2 border border-[var(--contrast-3)] rounded font-bold text-[var(--contrast)] bg-[var(--base-3)] w-full">
                       <option value={1}>1-Tages-Turnier (Alle Spiele an Tag 1)</option>
                       <option value={2}>2-Tages-Turnier (K.O.-Spiele an Tag 2)</option>
                     </select>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                     <Clock className="text-[var(--contrast-2)]" />
                     <div className="font-bold text-[var(--contrast)]">{tournamentDays === 1 ? 'Turnier-Startzeit:' : 'Startzeit Tag 1:'}</div>
                     <input type="time" value={day1Start} onChange={(e) => setDay1Start(e.target.value)} className="p-2 border border-[var(--contrast-3)] rounded font-bold text-[var(--tcw-green)] bg-[var(--base-3)]" />
                  </div>
                  {tournamentDays === 2 && (
                    <div className="flex items-center space-x-3">
                       <Clock className="text-[var(--contrast-2)]" />
                       <div className="font-bold text-[var(--contrast)]">Startzeit Tag 2 (K.O.):</div>
                       <input type="time" value={day2Start} onChange={(e) => setDay2Start(e.target.value)} className="p-2 border border-[var(--contrast-3)] rounded font-bold text-[var(--tcw-green)] bg-[var(--base-3)]" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row gap-4 mt-4 pt-4 border-t border-[var(--contrast-3)]">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="isolateFinals" checked={isolateGrandFinals} onChange={(e) => setIsolateGrandFinals(e.target.checked)} className="w-5 h-5 rounded border-[var(--contrast-3)]" />
                    <label htmlFor="isolateFinals" className="font-bold text-[var(--contrast)]">Finale isolieren (Nach anderen Spielen ansetzen)</label>
                  </div>
                  <div className="flex items-center space-x-3 md:ml-auto">
                    <Clock className="text-[var(--contrast-2)]" />
                    <div className="font-bold text-[var(--contrast)]">Spieldauer (Min.):</div>
                    <input type="number" min="15" step="15" value={matchDuration} onChange={(e) => setMatchDuration(Number(e.target.value))} className="p-2 border border-[var(--contrast-3)] rounded font-bold text-[var(--contrast)] bg-[var(--base-3)] w-24" />
                  </div>
                </div>
                
                {/* Dynamische Kategorien Bearbeiten */}
                <div className="flex flex-col md:flex-row gap-4 mt-4 pt-4 border-t border-[var(--contrast-3)]">
                  <div className="flex items-center space-x-3 w-full md:w-1/2">
                    <Users className="text-[var(--contrast-2)]" />
                    <div className="font-bold text-[var(--contrast)] whitespace-nowrap">Name Kat. 1:</div>
                    <input type="text" value={categories.U50} onChange={(e) => setCategories({...categories, U50: e.target.value})} className="p-2 border border-[var(--contrast-3)] rounded font-bold text-[var(--contrast)] bg-[var(--base-3)] w-full" />
                  </div>
                  <div className="flex items-center space-x-3 w-full md:w-1/2">
                    <Users className="text-[var(--contrast-2)]" />
                    <div className="font-bold text-[var(--contrast)] whitespace-nowrap">Name Kat. 2:</div>
                    <input type="text" value={categories.O50} onChange={(e) => setCategories({...categories, O50: e.target.value})} className="p-2 border border-[var(--contrast-3)] rounded font-bold text-[var(--contrast)] bg-[var(--base-3)] w-full" />
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print:block">
                <div className="col-span-1 bg-[var(--base-2)] p-6 rounded border border-[var(--base)] h-fit print:hidden">
                  <h3 className="heading-font font-bold text-lg mb-4 flex items-center text-[var(--contrast)]">
                    {editingTeam ? <Edit2 size={18} className="mr-2 text-[var(--tcw-orange)]"/> : <PlusCircle size={18} className="mr-2 text-[var(--tcw-green)]"/>} 
                    {editingTeam ? 'Team bearbeiten' : 'Neues Team'}
                  </h3>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="p-3 bg-[var(--base-3)] border border-[var(--contrast-3)] rounded space-y-3">
                      <div className="text-xs font-bold text-[var(--contrast-2)] uppercase tracking-wider">Spieler 1</div>
                      <div><input value={regForm.p1Name} onChange={e=>setRegForm({...regForm, p1Name: e.target.value})} className="w-full p-2 border border-[var(--contrast-3)] rounded text-sm bg-[var(--base-3)]" placeholder="Name" required /></div>
                      <div><input value={regForm.p1Club} onChange={e=>setRegForm({...regForm, p1Club: e.target.value})} className="w-full p-2 border border-[var(--contrast-3)] rounded text-sm bg-[var(--base-3)]" placeholder="Verein" /></div>
                    </div>
                    <div className="p-3 bg-[var(--base-3)] border border-[var(--contrast-3)] rounded space-y-3">
                      <div className="text-xs font-bold text-[var(--contrast-2)] uppercase tracking-wider">Spieler 2</div>
                      <div><input value={regForm.p2Name} onChange={e=>setRegForm({...regForm, p2Name: e.target.value})} className="w-full p-2 border border-[var(--contrast-3)] rounded text-sm bg-[var(--base-3)]" placeholder="Name" required /></div>
                      <div><input value={regForm.p2Club} onChange={e=>setRegForm({...regForm, p2Club: e.target.value})} className="w-full p-2 border border-[var(--contrast-3)] rounded text-sm bg-[var(--base-3)]" placeholder="Verein" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-bold text-[var(--contrast)] mb-1">Stärke</label>
                        <select value={regForm.level} onChange={e=>setRegForm({...regForm, level: e.target.value})} className="w-full p-2 border border-[var(--contrast-3)] rounded bg-[var(--base-3)]">
                          <option value="3">3 - Fortgeschritten</option><option value="2">2 - Mittel</option><option value="1">1 - Anfänger</option>
                        </select></div>
                      <div><label className="block text-sm font-bold text-[var(--contrast)] mb-1">Kategorie</label>
                        <select value={regForm.category} onChange={e=>setRegForm({...regForm, category: e.target.value})} className="w-full p-2 border border-[var(--contrast-3)] rounded bg-[var(--base-3)]">
                          <option value="U50">{categories.U50}</option>
                          <option value="O50">{categories.O50}</option>
                        </select></div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button type="submit" className={`flex-1 text-[var(--base-3)] py-2 rounded font-bold transition ${editingTeam ? 'bg-[var(--tcw-orange)]' : 'bg-[var(--tcw-green)] hover:bg-[var(--tcw-green-dark)]'}`}>
                        {editingTeam ? 'Aktualisieren' : 'Registrieren'}
                      </button>
                      {editingTeam && (
                        <button type="button" onClick={() => {setEditingTeam(null); setRegForm({ p1Name: '', p1Club: '', p2Name: '', p2Club: '', level: '2', category: 'U50' });}} className="px-4 bg-[var(--contrast-3)] text-[var(--base-3)] rounded hover:bg-[var(--contrast-2)] font-bold transition">
                          Abbruch
                        </button>
                      )}
                    </div>
                  </form>
                </div>
                
                <div className="col-span-2 print:w-full">
                  <div className="flex justify-between items-center mb-4 print:hidden">
                     <h3 className="heading-font font-bold text-lg text-[var(--contrast)]">Registrierte Teams ({teams.length})</h3>
                     <div className="flex space-x-2">
                       <label className="flex items-center space-x-2 bg-[var(--base-2)] text-[var(--contrast)] border border-[var(--contrast-3)] px-3 py-1.5 rounded hover:bg-[var(--base)] font-bold transition cursor-pointer text-sm shadow-sm">
                         <Upload size={16} /> <span className="hidden xl:inline">Laden</span>
                         <input type="file" accept=".json" className="hidden" onChange={handleImportTeams} />
                       </label>
                       <button onClick={handleExportTeams} disabled={teams.length === 0} className="flex items-center space-x-2 bg-[var(--base-2)] text-[var(--contrast)] border border-[var(--contrast-3)] px-3 py-1.5 rounded hover:bg-[var(--base)] font-bold transition disabled:opacity-50 text-sm shadow-sm">
                         <Download size={16} /> <span className="hidden xl:inline">Speichern</span>
                       </button>
                     </div>
                  </div>
                  <div className="overflow-auto max-h-[600px] border border-[var(--contrast-3)] rounded bg-[var(--base-3)] print:max-h-none print:overflow-visible print:border-none">
                    <table className="w-full text-left text-sm table-fixed">
                      <thead className="bg-[var(--base)] sticky top-0 shadow-sm z-10 text-[var(--contrast-2)] border-b border-[var(--contrast-3)] print:bg-white print:text-[var(--contrast)] print:border-b-2 print:border-[var(--contrast)]">
                        <tr>
                          <th className="p-3 w-1/3 print:w-1/3">Team</th>
                          <th className="p-3 w-1/4 print:w-1/3">Vereine</th>
                          <th className="p-3 w-20 print:w-24">Kat</th>
                          <th className="p-3 w-16 text-center text-[var(--tcw-green)] print:hidden">PIN</th>
                          <th className="hidden print:table-cell p-3 w-24 text-center border-l border-[var(--contrast-3)]">Anwesend</th>
                          <th className="p-3 w-24 print:hidden"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--base)] print:divide-[var(--contrast-3)]">
                        {teams.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-[var(--contrast-2)]">Noch keine Teams registriert.</td></tr> : 
                         teams.map((t) => (
                          <tr key={t.id} className={`hover:bg-[var(--base-2)] transition print:border-b print:border-[var(--base)] ${editingTeam?.id === t.id ? 'bg-[var(--base)]' : ''}`}>
                            <td className="p-3 font-bold text-[var(--contrast)] truncate print:whitespace-normal print:break-words print:py-4 print:text-base">{t.name}</td>
                            <td className="p-3 text-xs text-[var(--contrast-2)] truncate print:whitespace-normal print:break-words print:text-sm print:text-[var(--contrast)] print:py-4">{t.clubs.join(' / ') || 'Kein Verein'}</td>
                            <td className="p-3 print:py-4"><span className="border border-[var(--contrast-3)] print:border-none px-2 print:px-0 py-1 rounded text-xs font-bold print:text-sm">{categories[t.category]?.substring(0,3)} {t.category}</span></td>
                            <td className="p-3 text-center font-mono font-bold text-[var(--tcw-green)] print:hidden">{t.pin}</td>
                            <td className="hidden print:table-cell p-3 text-center align-middle border-l border-[var(--contrast-3)]">
                                <div className="w-6 h-6 border-2 border-[var(--contrast)] rounded mx-auto"></div>
                            </td>
                            <td className="p-3 text-right space-x-2 print:hidden">
                               <button onClick={() => handleEdit(t)} className="text-[var(--contrast-3)] hover:text-[var(--tcw-green)] transition"><Edit2 size={16}/></button>
                               <button onClick={() => confirmDelete === t.id ? handleDelete(t.id) : setConfirmDelete(t.id)} className={`transition ${confirmDelete === t.id ? 'text-[var(--base-3)] bg-[var(--tcw-orange)] px-2 rounded font-bold' : 'text-[var(--contrast-3)] hover:text-[var(--tcw-orange)]'}`}>
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

          {/* Groups Tab */}
          {activeTab === 'groups' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center print:hidden">
                <p className="text-[var(--contrast-2)]">Gruppen, ausbalanciert nach Spielstärke und Vereinszugehörigkeit.</p>
                <div className="space-x-3">
                   <button onClick={generateGroups} disabled={teams.length < 4} className="bg-[var(--base)] text-[var(--contrast)] border border-[var(--contrast-3)] hover:bg-[var(--base-2)] px-4 py-2 rounded font-bold disabled:opacity-50 transition">
                     1. Gruppen neu generieren
                   </button>
                   <button onClick={() => setSchedulePrompt(true)} disabled={Object.keys(groups.U50).length === 0 && Object.keys(groups.O50).length === 0} className="bg-[var(--tcw-green)] text-[var(--base-3)] hover:bg-[var(--tcw-green-dark)] px-4 py-2 rounded font-bold disabled:opacity-50 transition">
                     2. Spielplan erstellen
                   </button>
                </div>
              </div>

              {['U50', 'O50'].map(cat => (
                 groups[cat] && Object.keys(groups[cat]).length > 0 && (
                   <div key={cat} className="mb-10 page-break-after">
                     <div className="hidden print:block mb-6 border-b-2 border-[var(--contrast)] pb-2">
                        <h1 className="heading-font text-3xl font-black uppercase text-[var(--contrast)]">{BRAND.name}</h1>
                        <h2 className="text-xl font-bold text-[var(--contrast-2)] mt-1">Gruppenübersicht - {categories[cat]}</h2>
                     </div>
                     <h2 className="heading-font text-2xl font-bold text-[var(--contrast)] mb-6 border-b border-[var(--contrast-3)] pb-2 flex items-center print:hidden">
                       {categories[cat]} <span className="ml-3 text-sm border border-[var(--contrast-3)] px-3 py-1 rounded text-[var(--contrast-2)]">{Object.keys(groups[cat]).length} Gruppen</span>
                     </h2>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:gap-4">
                        {Object.entries(groups[cat]).sort((a,b) => a[0].localeCompare(b[0])).map(([groupName, groupTeams]) => (
                          <div key={groupName} className="border border-[var(--contrast-3)] rounded overflow-hidden break-inside-avoid print:border-2">
                            <div className="bg-[var(--base)] p-3 font-bold text-[var(--contrast)] border-b border-[var(--contrast-3)]">{groupName}</div>
                            <table className="w-full text-sm text-left table-fixed">
                              <thead className="bg-[var(--base-3)] text-[var(--contrast-2)] uppercase text-xs border-b border-[var(--contrast-3)]">
                                <tr>
                                  <th className="px-4 py-2 w-12">Pos</th>
                                  <th className="px-4 py-2">Team</th>
                                  <th className="px-4 py-2 text-center w-16">S-N</th>
                                  <th className="px-4 py-2 text-center w-20">Sätze</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--base)]">
                                {(standings[cat][groupName] || groupTeams).map((t, index) => (
                                  <tr key={t.id} className="hover:bg-[var(--base-2)] transition">
                                    <td className="px-4 py-3 font-bold text-[var(--contrast-3)]">{index + 1}</td>
                                    <td className="px-4 py-3 truncate print:whitespace-normal print:break-words">
                                      <div className="font-bold text-[var(--contrast)] truncate print:whitespace-normal">{t.name}</div>
                                      <div className="text-xs text-[var(--contrast-2)] truncate print:whitespace-normal">{t.clubs.join(' / ')}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-[var(--contrast)]">{t.won !== undefined ? `${t.won}-${t.lost}` : '0-0'}</td>
                                    <td className="px-4 py-3 text-center text-[var(--contrast-2)]">{t.setsWon !== undefined ? `${t.setsWon}:${t.setsLost}` : '0:0'}</td>
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

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div>
               <div className="flex justify-between items-center mb-6 print:hidden">
                 <h2 className="heading-font text-xl font-bold text-[var(--contrast)]">Spielplan</h2>
                 <div className="flex space-x-3">
                   {matches.some(m => m.day === 1 && m.time === 'Flexibel') && (
                     <button onClick={() => { setPrintView('sheets'); setTimeout(() => { window.print(); setPrintView('normal'); }, 150); }} className="bg-[var(--contrast)] text-[var(--base-3)] px-4 py-2 rounded font-bold hover:bg-[var(--contrast-2)] transition flex items-center">
                       <Printer size={18} className="mr-2"/> Berichte drucken
                     </button>
                   )}
                   <button onClick={() => fillMissingScores('Group')} className="bg-[var(--base)] text-[var(--contrast)] border border-[var(--contrast-3)] px-4 py-2 rounded font-bold hover:bg-[var(--base-2)] transition">
                     Ergebnisse auto-ausfüllen
                   </button>
                   <button onClick={handleKoGeneration} disabled={!canGenerateKO} className={`px-5 py-2 rounded font-bold transition flex items-center ${canGenerateKO ? 'bg-[var(--tcw-green)] text-[var(--base-3)] hover:bg-[var(--tcw-green-dark)]' : 'bg-[var(--contrast-3)] text-[var(--base-3)] cursor-not-allowed'}`}>
                      <Trophy size={18} className="mr-2"/> 
                      {!canGenerateKO && groupMatches.length > 0 ? `Zuerst ${unplayedGroupCount} Gruppenspiele eintragen` : `K.O.-Baum erstellen`}
                   </button>
                 </div>
               </div>

               <div className="space-y-8">
                 <div className="hidden print:block mb-4 border-b-2 border-[var(--contrast)] pb-2">
                    <h1 className="heading-font text-3xl font-black uppercase text-[var(--contrast)]">{BRAND.name}</h1>
                    <h2 className="text-xl font-bold text-[var(--contrast-2)] mt-1">Offizieller Spielplan</h2>
                 </div>
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
                        <h3 className="heading-font text-lg font-bold bg-[var(--tcw-green)] print:bg-[var(--contrast)] print:text-white text-[var(--base-3)] p-4 print:p-2 rounded-t flex justify-between items-center">
                          <span>{tournamentDays === 1 ? `Alle Spiele (${getFormattedDate(startDate, 0)})` : `Tag ${day} (${getFormattedDate(startDate, day - 1)}) ${day===1 ? '(Gruppenphase)' : '(Finals & Platzierungen)'}`}</span>
                          <span className="text-sm border border-[var(--base-3)] px-3 py-1 rounded print:hidden">
                            {tournamentDays === 1 ? `Gruppen: ${day1Start} | K.O.: ${day2Start}` : `Start: ${day===1 ? day1Start : day2Start}`}
                          </span>
                        </h3>
                        <div className="border border-[var(--contrast-3)] rounded-b overflow-x-auto bg-[var(--base-3)] print:overflow-visible print:border-x-0 print:border-b-0">
                          <table className="w-full text-sm table-fixed min-w-[900px] print:min-w-0 print:text-xs">
                            <thead className="bg-[var(--base)] text-[var(--contrast-2)] uppercase text-xs border-b border-[var(--contrast-3)] print:bg-white print:text-[var(--contrast)] print:border-b-2 print:border-[var(--contrast)]">
                              <tr>
                                <th className="p-3 print:p-2 text-left w-32 print:w-24">Zeit</th>
                                <th className="p-3 print:p-2 text-left w-24 print:w-16">Platz</th>
                                <th className="p-3 print:p-2 text-left w-48 print:w-40">Phase</th>
                                <th className="p-3 print:p-2 text-right">Team 1</th>
                                <th className="p-3 print:p-2 text-center w-40 print:w-28">Ergebnis</th>
                                <th className="p-3 print:p-2 text-left">Team 2</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--base)]">
                              {[...dayMatches, ...unscheduled].map((m) => {
                                const isT1Winner = m.winnerId === m.team1?.id;
                                const isT2Winner = m.winnerId === m.team2?.id;
                                const isMissingTeams = !m.team1 || !m.team2;
                                const isBye = m.team1?.isBye || m.team2?.isBye;
                                const isUnscheduled = m.time === null;
                                
                                return (
                                <tr key={m.id} className={`transition ${isMissingTeams || isBye || isUnscheduled ? '' : 'cursor-pointer hover:bg-[var(--base-2)]'} print:border-b print:border-[var(--base)]`} 
                                    onClick={() => !isMissingTeams && !isBye && !isUnscheduled && setScoreModal(m)}>
                                  <td className={`p-3 print:p-2 whitespace-nowrap print:whitespace-normal font-bold ${isUnscheduled ? 'text-[var(--tcw-orange)]' : (m.time === 'Flexibel' ? 'text-[var(--tcw-green-dark)] text-xs tracking-widest' : 'text-[var(--contrast)]')}`}>
                                      <div>
                                        <div>{m.time || 'Nicht angesetzt'}</div>
                                        {m.endTime && <div className="text-[10px] text-[var(--contrast-2)] font-medium">bis {m.endTime}</div>}
                                      </div>
                                  </td>
                                  <td className="p-3 print:p-2 whitespace-nowrap print:whitespace-normal">{m.court ? <span className="border border-[var(--contrast-3)] print:border-none px-2 print:px-0 py-1 rounded text-xs font-bold">Platz {m.court}</span> : '-'}</td>
                                  <td className="p-3 print:p-2 text-xs truncate print:whitespace-normal print:break-words">
                                    <span className="block font-bold text-[var(--tcw-green)] print:text-[var(--contrast)]">{categories[m.category]?.substring(0,3)} {m.category}</span>
                                    <span className="text-[var(--contrast-2)] print:text-[var(--contrast)]">{formatStageGroupName(m.stage, m.groupName)}</span>
                                    {matchCodeMap[m.id] && <span className="inline-block mt-1 bg-[var(--base-2)] border border-[var(--contrast-3)] px-1.5 py-0.5 rounded text-[10px] font-bold text-[var(--contrast)]">{matchCodeMap[m.id]}</span>}
                                  </td>
                                  <td className={`p-3 print:p-2 text-right truncate print:whitespace-normal print:break-words ${isT1Winner ? 'font-bold text-[var(--tcw-green-dark)] print:text-black' : 'text-[var(--contrast)]'}`}>
                                    {m.team1?.isBye ? <span className="text-[var(--tcw-orange)] font-bold italic">Freilos</span> : (m.team1?.name || 'Offen')}
                                  </td>
                                  <td className="p-3 print:p-2 text-center bg-[var(--base-2)] border-x border-[var(--base)] print:bg-white print:border-x-0 print:border-dashed print:border-[var(--contrast-3)] print:whitespace-normal">
                                     {isBye ? <span className="text-[var(--contrast-3)] italic text-xs font-bold">KEIN SPIEL</span> : renderScore(m.score)}
                                  </td>
                                  <td className={`p-3 print:p-2 text-left truncate print:whitespace-normal print:break-words ${isT2Winner ? 'font-bold text-[var(--tcw-green-dark)] print:text-black' : 'text-[var(--contrast)]'}`}>
                                    {m.team2?.isBye ? <span className="text-[var(--tcw-orange)] font-bold italic">Freilos</span> : (m.team2?.name || 'Offen')}
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

          {/* Bracket Tab */}
          {activeTab === 'bracket' && (
             <div className="overflow-x-auto pb-12">
               {['U50', 'O50'].map(cat => {
                 if (!brackets[cat]) return null;
                 const getMatchData = (id) => matches.find(m => m.id === id);
                 
                 return (
                   <div key={cat} className="mb-16 page-break-after">
                      <h2 className="heading-font text-2xl font-bold text-[var(--contrast)] mb-8 border-b border-[var(--contrast-3)] pb-2 flex items-center">
                         <Trophy className="text-[var(--tcw-yellow)] mr-3" strokeWidth={2.5}/> Hauptrunde: {categories[cat]}
                      </h2>
                      
                      <div className="flex items-stretch min-w-max h-[500px]">
                        <div className="flex flex-col justify-around h-full w-64 z-10">
                           {brackets[cat].qf.map((qf, i) => <OfficialMatchBox key={i} match={getMatchData(qf.id)} title={`Viertelfinale ${i+1}`} />)}
                        </div>
                        <BracketConnector count={2} width="w-10" borderColor="border-[var(--contrast-3)]" />
                        <div className="flex flex-col justify-around h-full w-64 z-10">
                           {brackets[cat].sf.map((sf, i) => <OfficialMatchBox key={i} match={getMatchData(sf.id)} title={sf.title} />)}
                        </div>
                        <BracketConnector count={1} width="w-10" borderColor="border-[var(--contrast-3)]" />
                        <div className="flex flex-col justify-around h-full w-64 z-10">
                           <OfficialMatchBox match={getMatchData(brackets[cat].finals[0].id)} title="FINALE" isFinal={true} />
                        </div>
                      </div>

                      <h3 className="heading-font text-xl font-bold text-[var(--contrast-2)] mt-12 mb-4 border-b border-[var(--contrast-3)] pb-2">Platzierungsspiele (Plätze 3-8)</h3>
                      <div className="flex flex-wrap gap-8">
                        <div className="space-y-4">
                           {brackets[cat].pSf.map((pSf, i) => <OfficialMatchBox key={i} match={getMatchData(pSf.id)} title={pSf.title} />)}
                        </div>
                        <div className="space-y-4">
                           <OfficialMatchBox match={getMatchData(brackets[cat].finals[2].id)} title="Platzierungsspiel, Platz 5" />
                           <OfficialMatchBox match={getMatchData(brackets[cat].finals[3].id)} title="Platzierungsspiel, Platz 7" />
                        </div>
                        <div className="space-y-4">
                           <OfficialMatchBox match={getMatchData(brackets[cat].finals[1].id)} title="Platzierungsspiel, Platz 3" />
                        </div>
                      </div>
                   </div>
                 )
               })}
             </div>
          )}

          {/* Rankings Tab */}
          {activeTab === 'rankings' && (
             <div className="space-y-12">
               <div className="flex justify-end print:hidden mb-4">
                  <button 
                    onClick={() => { setPrintView('certificates'); setTimeout(() => { window.print(); setPrintView('normal'); }, 600); }} 
                    className="bg-[var(--tcw-green)] text-[var(--base-3)] px-5 py-2 rounded font-bold hover:bg-[var(--tcw-green-dark)] transition flex items-center shadow-sm"
                  >
                     <Award size={18} className="mr-2"/> Urkunden drucken
                  </button>
               </div>
               {['U50', 'O50'].map(cat => {
                 const finalMatchId = brackets[cat]?.finals?.[0]?.id;
                 const finalMatch = matches.find(m => m.id === finalMatchId);
                 const isEnded = finalMatch && finalMatch.winnerId !== null;

                 if (!isEnded) {
                   return (
                     <div key={cat} className="page-break-after">
                        <h2 className="heading-font text-2xl font-bold text-[var(--contrast)] mb-6 border-b border-[var(--contrast-3)] pb-2 flex items-center">
                          <Award className="mr-3 text-[var(--tcw-yellow)]" /> Abschlussplatzierungen: {categories[cat]}
                        </h2>
                        <div className="bg-[var(--base-2)] p-6 rounded text-center border border-[var(--contrast-3)] text-[var(--contrast-2)] font-bold">
                           Die finale Rangliste wird erst nach Abschluss des Finales veröffentlicht.
                        </div>
                     </div>
                   );
                 }

                 if (!finalRankings[cat] || finalRankings[cat].length === 0) return null;
                 
                 return (
                   <div key={cat} className="page-break-after">
                      <div className="hidden print:block mb-6 border-b-2 border-[var(--contrast)] pb-2">
                        <h1 className="heading-font text-3xl font-black uppercase text-[var(--contrast)]">{BRAND.name}</h1>
                        <h2 className="text-xl font-bold text-[var(--contrast-2)] mt-1">Abschlussplatzierungen - {categories[cat]}</h2>
                      </div>
                      <h2 className="heading-font text-2xl font-bold text-[var(--contrast)] mb-6 border-b border-[var(--contrast-3)] pb-2 flex items-center print:hidden">
                        <Award className="mr-3 text-[var(--tcw-yellow)]" /> Abschlussplatzierungen: {categories[cat]}
                      </h2>
                      <div className="border border-[var(--contrast-3)] rounded overflow-hidden print:border-none">
                        <table className="w-full text-left text-sm table-fixed">
                           <thead className="bg-[var(--base)] text-[var(--contrast-2)] uppercase text-xs border-b border-[var(--contrast-3)] print:bg-white print:text-[var(--contrast)] print:border-b-2 print:border-[var(--contrast)]">
                             <tr>
                               <th className="p-4 print:p-2 w-20 text-center border-r border-[var(--contrast-3)] print:border-none">Platz</th>
                               <th className="p-4 print:p-2 w-1/3 text-left">Team</th>
                               <th className="p-4 print:p-2 text-left">Vereine</th>
                               <th className="p-4 print:p-2 w-32 text-center">Status</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-[var(--base)]">
                             {finalRankings[cat].map((item, idx) => (
                               <tr key={item.team?.id} className="hover:bg-[var(--base-2)] transition bg-[var(--base-3)] print:border-b print:border-[var(--base)] break-inside-avoid">
                                 <td className="p-4 print:p-2 text-center font-bold text-lg border-r border-[var(--contrast-3)] print:border-none text-[var(--contrast)]">
                                   {idx === 0 ? '🏆 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : item.rank}
                                 </td>
                                 <td className="p-4 print:p-2 font-bold text-[var(--contrast)] truncate print:whitespace-normal print:break-words text-left">{item.team?.name}</td>
                                 <td className="p-4 print:p-2 text-[var(--contrast-2)] print:text-[var(--contrast)] truncate print:whitespace-normal print:break-words text-left">{item.team?.clubs.join(' / ')}</td>
                                 <td className="p-4 print:p-2 text-center">
                                   {idx < 8 
                                     ? <span className="border border-[var(--tcw-green)] text-[var(--tcw-green)] px-2 py-1 rounded text-xs font-bold">K.O.-Phase</span> 
                                     : <span className="border border-[var(--contrast-3)] text-[var(--contrast-2)] px-2 py-1 rounded text-xs font-bold">Gruppenphase</span>}
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

      {/* Print View Tickets */}
      {printView === 'tickets' && (
        <div className="hidden print:block w-full bg-[var(--base-3)] text-[var(--contrast)] p-8">
          <div className="grid grid-cols-2 gap-8">
            {teams.map(t => {
              const loginUrl = `${window.location.origin}${window.location.pathname}?pin=${t.pin}`;
              return (
                <div key={t.id} className="border-2 border-[var(--contrast)] p-6 rounded-lg flex flex-col items-center text-center break-inside-avoid">
                  <div className="mb-4">
                     <img src={BRAND.logo} alt="Logo" className="h-16 object-contain" />
                  </div>
                  <h2 className="heading-font text-2xl font-black mb-1">{t.name}</h2>
                  <p className="text-[var(--contrast-2)] font-bold mb-6">{t.clubs.join(' / ')} • {categories[t.category]}</p>
                  <div className="border-4 border-[var(--contrast)] p-3 rounded mb-6">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(loginUrl)}`} alt="QR Code" className="w-40 h-40" />
                  </div>
                  <div className="bg-[var(--base-2)] px-6 py-3 rounded border border-[var(--contrast-3)]">
                     <span className="text-[var(--contrast-2)] text-xs uppercase font-bold tracking-widest block mb-1">Team PIN</span>
                     <span className="font-mono font-black text-3xl tracking-widest text-[var(--tcw-green-dark)]">{t.pin}</span>
                  </div>
                  <p className="text-sm text-[var(--contrast-3)] mt-6 font-bold w-3/4">QR-Code mit dem Smartphone scannen, um den Live-Spielplan aufzurufen.</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Print View Sheets */}
      {printView === 'sheets' && (
        <div className="hidden print:block w-full bg-[var(--base-3)] text-[var(--contrast)] p-8">
          {['U50', 'O50'].map(cat => {
            if (!groups[cat] || Object.keys(groups[cat]).length === 0) return null;
            return Object.entries(groups[cat]).sort((a,b) => a[0].localeCompare(b[0])).map(([groupName, groupTeams]) => {
              const gMatches = matches.filter(m => m.category === cat && m.groupName === groupName && m.stage === 'Group').sort((a,b) => (a.matchOrder || 0) - (b.matchOrder || 0));
              if (gMatches.length === 0) return null;
              const courtNum = gMatches[0].court;
              return (
                <div key={`${cat}-${groupName}`} className="page-break-after pb-10">
                   <div className="flex justify-between items-end border-b-4 border-[var(--contrast)] pb-4 mb-6">
                      <div>
                         <h1 className="heading-font text-4xl font-black uppercase text-[var(--contrast)]">{BRAND.name}</h1>
                         <div className="text-xl font-bold text-[var(--contrast-2)] mt-1">Offizieller Gruppen-Spielbericht</div>
                         <div className="text-md font-bold text-[var(--contrast-3)] mt-1">Tag 1 ({getFormattedDate(startDate, 0)})</div>
                      </div>
                      <div className="text-right">
                         <h2 className="heading-font text-3xl font-extrabold text-[var(--contrast)]">{categories[cat]}</h2>
                         <h3 className="text-2xl font-bold text-[var(--tcw-green)] mt-1">{groupName} • Platz {courtNum}</h3>
                      </div>
                   </div>
                   
                   <table className="w-full text-left border-collapse border border-[var(--contrast)] mb-6">
                      <thead className="bg-[var(--base)] border-b border-[var(--contrast)]">
                        <tr>
                          <th className="border-r border-[var(--contrast)] p-4 text-center w-24">Code</th>
                          <th className="border-r border-[var(--contrast)] p-4 text-lg w-1/3">Team 1</th>
                          <th className="border-r border-[var(--contrast)] p-4 text-lg w-1/3">Team 2</th>
                          <th className="border-r border-[var(--contrast)] p-4 text-center">Satz 1</th>
                          <th className="border-r border-[var(--contrast)] p-4 text-center">Satz 2</th>
                          <th className="p-4 text-center">Tiebreak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--contrast)]">
                        {gMatches.map(m => (
                          <tr key={m.id}>
                             <td className="border-r border-[var(--contrast)] p-5 text-center font-black text-xl bg-[var(--base-2)]">{matchCodeMap[m.id] || '-'}</td>
                             <td className="border-r border-[var(--contrast)] p-5 font-bold text-xl">{m.team1?.name || 'Offen'}</td>
                             <td className="border-r border-[var(--contrast)] p-5 font-bold text-xl">{m.team2?.name || 'Offen'}</td>
                             <td className="border-r border-[var(--contrast)] p-5"></td>
                             <td className="border-r border-[var(--contrast)] p-5"></td>
                             <td className="p-5"></td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                   <div className="text-[var(--contrast-2)] font-medium text-lg text-center mt-8">Bitte füllen Sie die Ergebnisse leserlich aus und bringen Sie diesen Bogen zur Turnierleitung.</div>
                </div>
              )
            })
          })}
        </div>
      )}

      {/* Print View Certificates */}
      {printView === 'certificates' && (
        <div className="hidden print:block w-full bg-[var(--base-3)] text-[var(--contrast)]">
          {['U50', 'O50'].map(cat => {
            if (!finalRankings[cat] || finalRankings[cat].length === 0) return null;
            return finalRankings[cat].map((item) => {
              const isTop4 = item.rank <= 4;
              return (
                <div key={item.team?.id} className="page-break-after p-0 m-0 w-[210mm] h-[297mm] box-border relative bg-[var(--base-3)] overflow-hidden">
                   <div className="flex flex-col items-center justify-between p-10 border-[10px] border-double border-[var(--tcw-green)] absolute inset-0 m-4 box-border bg-[var(--base-3)]">
                       {/* Watermark Logo */}
                       <div className="absolute inset-0 z-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
                           <img src={BRAND.logo} alt="Watermark" className="w-[500px] h-[500px] object-contain grayscale" />
                       </div>

                       <div className="relative z-10 flex flex-col items-center w-full h-full text-center justify-between">
                           
                           {/* Header Banners */}
                           <div className="flex flex-col items-center w-full px-4 pt-4 space-y-6">
                              <img src={BRAND.sponsorBanner} alt="WTB Kessler Sponsor" className="h-24 w-auto object-contain" />
                              <div className="flex items-center justify-center space-x-4">
                                 <h1 className="heading-font text-6xl font-extrabold text-[var(--tcw-orange)] tracking-widest leading-none">TC Wannweil e.V.</h1>
                              </div>
                           </div>

                           {/* Title */}
                           <div className="mt-6 mb-2">
                              <div className="heading-font text-5xl font-black uppercase text-[var(--contrast)] tracking-[0.4em] mb-2">Urkunde</div>
                              <div className="h-1 w-32 bg-[var(--tcw-orange)] mx-auto"></div>
                           </div>

                           {/* Body */}
                           <div className="flex-1 flex flex-col justify-center w-full space-y-4">
                              <div className="text-2xl font-medium text-[var(--contrast)] leading-relaxed">
                                 Wir gratulieren herzlich zum <br/>
                                 <span className="text-7xl font-black text-[var(--tcw-green-dark)] drop-shadow-sm block my-6">{item.rank}. Platz</span>
                                 beim Kessler-Cup Herren Bezirk D 2026 in Wannweil.
                              </div>

                              <div className="my-6 px-4">
                                 <h2 className="heading-font text-4xl font-extrabold text-[var(--contrast)] leading-tight">{item.team?.name}</h2>
                                 <p className="text-xl text-[var(--contrast-2)] mt-2 font-bold">{item.team?.clubs.join(' / ')}</p>
                              </div>
                           </div>

                           {/* Master-Turnier Note for Top 4 */}
                           <div className="flex items-center justify-center w-full px-4 mb-10 mt-2">
                               {isTop4 && (
                                  <div className="bg-[var(--base)] border border-[var(--contrast-3)] px-5 py-2.5 rounded-lg max-w-xl text-center shadow-sm">
                                     <h3 className="heading-font text-xs font-bold text-[var(--contrast-2)] uppercase tracking-widest flex justify-center items-center mb-0.5">
                                        <Trophy className="mr-2 text-[var(--contrast-3)]" size={14}/> Qualifiziert für das Masters
                                     </h3>
                                     <p className="text-[var(--contrast-2)] font-medium text-[10px]">
                                        Die besten vier Paarungen qualifizieren sich für das Kessler-Cup-Masters-Turnier am Ende der Saison.
                                     </p>
                                  </div>
                               )}
                           </div>

                           {/* Footer */}
                           <div className="w-full flex justify-between items-end px-12 pb-4">
                               <div className="text-center">
                                   <div className="border-b-2 border-[var(--contrast-2)] w-56 mb-2"></div>
                                   <p className="text-sm font-bold text-[var(--contrast-2)]">Wannweil, {new Date().toLocaleDateString('de-DE')}</p>
                               </div>
                               <div className="text-center">
                                   <div className="border-b-2 border-[var(--contrast-2)] w-56 mb-2"></div>
                                   <p className="text-sm font-bold text-[var(--contrast-2)]">Turnierleitung</p>
                               </div>
                           </div>
                       </div>
                   </div>
                </div>
              );
            });
          })}
        </div>
      )}

      {/* Modals */}
      {scoreModal && <ScoreEntryModal match={scoreModal} onClose={() => setScoreModal(null)} onSave={handleSaveScore} categories={categories} />}

      {schedulePrompt && (
        <div className="fixed inset-0 bg-[var(--contrast)]/80 flex items-center justify-center z-50 print:hidden p-4">
          <div className="bg-[var(--base-3)] rounded shadow-xl w-full max-w-lg overflow-hidden border border-[var(--contrast-3)]">
            <div className="bg-[var(--tcw-green)] p-4 flex justify-between items-center text-[var(--base-3)]">
               <h3 className="font-bold flex items-center"><Calendar size={20} className="mr-2"/> Spielplan-Methode</h3>
               <button onClick={() => setSchedulePrompt(false)} className="hover:text-[var(--contrast-3)] transition"><X size={20}/></button>
            </div>
            <div className="p-6">
              <p className="text-[var(--contrast)] mb-6 font-medium">
                Wie möchten Sie die Gruppenphase ansetzen?
              </p>
              <div className="flex flex-col space-y-3">
                <button onClick={() => generateSchedule('traditional')} className="bg-[var(--base)] text-[var(--contrast)] p-4 rounded font-bold hover:bg-[var(--base-2)] transition text-left flex flex-col border border-[var(--contrast-3)]">
                   <span className="text-lg mb-1">1. Klassische Zeitfenster</span> 
                   <span className="text-sm font-medium text-[var(--contrast-2)]">Weist jedem Spiel eine spezifische Startzeit zu.</span>
                </button>
                <button onClick={() => generateSchedule('courtPerGroup')} className="bg-[var(--tcw-green)] text-[var(--base-3)] border border-[var(--tcw-green-dark)] p-4 rounded font-bold hover:bg-[var(--tcw-green-dark)] transition text-left flex flex-col">
                   <span className="text-lg mb-1">2. Plätze an Gruppen zuweisen</span> 
                   <span className="text-sm font-medium opacity-90">Jede Gruppe bekommt einen Platz für den Tag. Flexibel.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {koConfig && (
        <div className="fixed inset-0 bg-[var(--contrast)]/80 flex items-center justify-center z-50 print:hidden p-4">
          <div className="bg-[var(--base-3)] rounded shadow-xl w-full max-w-lg overflow-hidden border border-[var(--contrast-3)] animate-in fade-in zoom-in">
            <div className="bg-[var(--tcw-green)] p-4 flex justify-between items-center text-[var(--base-3)]">
               <h3 className="font-bold flex items-center"><Trophy size={20} className="mr-2"/> K.O.-Runde ansetzen</h3>
               <button onClick={() => setKoConfig(null)} className="hover:opacity-70 transition"><X size={20}/></button>
            </div>
            <form onSubmit={handleKoSubmit} className="p-6">
              <div className="space-y-6">
                
                {tournamentDays === 2 && (
                  <div>
                    <label className="block text-[var(--contrast)] font-bold mb-2">Viertelfinal-Spiele (QFs) terminieren auf:</label>
                    <select name="qfDay" className="w-full p-3 border border-[var(--contrast-3)] rounded bg-[var(--base-2)] font-bold text-[var(--contrast)]">
                       <option value="1">Tag 1 (Im Anschluss an Gruppenphase)</option>
                       <option value="2">Tag 2 (Zu Beginn von Tag 2)</option>
                    </select>
                  </div>
                )}

                {koConfig.needsWildcard && (
                  <div>
                    <label className="block text-[var(--contrast)] font-bold mb-2">Nicht genügend Teams für 8er-Feld. Auffüllen durch:</label>
                    <select name="wildcards" className="w-full p-3 border border-[var(--contrast-3)] rounded bg-[var(--base-2)] font-bold text-[var(--contrast)]">
                       <option value="true">Beste Verlierer als Wildcards (Empfohlen)</option>
                       <option value="false">Freilose (Byes)</option>
                    </select>
                  </div>
                )}

                <button type="submit" className="w-full bg-[var(--tcw-green)] text-[var(--base-3)] py-3 px-4 rounded font-bold hover:bg-[var(--tcw-green-dark)] transition">
                   Spielplan generieren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print { 
            body { background: white; -webkit-print-color-adjust: exact; margin: 0; padding: 0; } 
            .page-break-after { page-break-after: always; } 
            .break-inside-avoid { break-inside: avoid; } 
            @page { 
                size: A4 ${printView === 'normal' && activeTab === 'bracket' ? 'landscape' : 'portrait'}; 
                margin: ${printView === 'normal' ? '15mm' : '0'}; 
            } 
        }
      `}} />
    </div>
  );
}