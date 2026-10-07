import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Builder from './builder/Builder'
import Game from './game/Game'
import Home from './Home'
import BuyMeCoffee from './components/BuyMeCoffee'


export default function App() {
  return (
    <>
      <header className="top">
        <NavLink to="/" end className="brand">40k Companion</NavLink>
        <nav>
          <NavLink to="/builder">List Builder</NavLink>
          <NavLink to="/game">Game Tracker</NavLink>
          <BuyMeCoffee small />
        </nav>      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/game" element={<Game />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="disclaimer">
        Unofficial fan project. Not affiliated with, endorsed by or sponsored by Games Workshop.
        Warhammer, Warhammer 40,000 and all associated names, rules, and imagery are trademarks or
        copyrights of Games Workshop Limited. No ownership is claimed.
      </footer>
    </>
  )
}
