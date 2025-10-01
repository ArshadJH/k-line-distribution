import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Group from './Group'

const ROUTES = {
  HOME: '/k-line-distribution',
  GROUP: '/k-line-distribution/:groupName'
}

const App = () => {
  const routes = [
    { path: ROUTES.HOME, element: <Home /> },
    { path: ROUTES.GROUP, element: <Group /> }
  ]

  return (
    <Router>
      <Routes>
        {routes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    </Router>
  )
}

export default App
