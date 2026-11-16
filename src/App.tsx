import { Done, History, WorkoutDetail } from './screens/History';
import { Editor } from './screens/Editor';
import { Home } from './screens/Home';
import { Log } from './screens/Log';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { useRoute } from './store';

const NAV = [
  { to: '/', label: 'Prediction', icon: '◎' },
  { to: '/today', label: 'Workout', icon: '▶' },
  { to: '/history', label: 'History', icon: '☰' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function App() {
  const [route, go] = useRoute();
  const [, seg, id] = route.split('/');
  let screen;
  switch (seg) {
    case '': screen = <Home go={go} />; break;
    case 'today': screen = <Today go={go} />; break;
    case 'edit': screen = <Editor go={go} />; break;
    case 'log': screen = <Log go={go} />; break;
    case 'done': screen = <Done id={id} go={go} />; break;
    case 'history': screen = <History go={go} />; break;
    case 'workout': screen = <WorkoutDetail id={id} go={go} />; break;
    case 'settings': screen = <Settings />; break;
    default: screen = <Home go={go} />;
  }
  const active = (to: string) =>
    to === '/' ? seg === '' : to === '/today' ? ['today', 'edit', 'log', 'done'].includes(seg) : route.startsWith(to) || (to === '/history' && seg === 'workout');
  return (
    <>
      <main>{screen}</main>
      <nav className="tabbar">
        {NAV.map((n) => (
          <a key={n.to} href={`#${n.to}`} className={active(n.to) ? 'active' : ''}>
            <span className="ic">{n.icon}</span>
            {n.label}
          </a>
        ))}
      </nav>
    </>
  );
}
