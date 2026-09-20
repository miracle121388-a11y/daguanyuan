import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/garden.css';
import './styles/reference-world.css';
import './styles/simulation.css';
import './styles/story.css';
import './styles/dreams.css';
import './styles/palette.css';
// The R3F canvas owns GPU resources; mount it once during local development.
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
