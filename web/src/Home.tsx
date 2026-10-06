import { Link } from 'react-router-dom'
import BuyMeCoffee from './components/BuyMeCoffee'

export default function Home() {
  return (
    <div className="home">
      <h1>Warhammer 40k 11th Edition Companion</h1>
      <p className="lead">Local game tracker for dispositions, primaries, secondaries, CP and VP.</p>

      <div className="home-links">
        <Link to="/game" className="home-btn">Game Tracker</Link>
        <Link to="/builder" className="home-btn">List Builder</Link>
      </div>

      <section>
        <h2>Currently supported armies</h2>
        <ul>
          <li>Adeptus Custodes</li>
        </ul>
      </section>

      <section className="support">
        <h2>Consider Supporting</h2>
        <BuyMeCoffee />
      </section>
    </div>
  )
}
