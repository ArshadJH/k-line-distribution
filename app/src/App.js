import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Group from './Group';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/k-line-distribution" element={<Home />} />
        <Route path="/k-line-distribution/:groupName" element={<Group />} />
      </Routes>
    </Router>
  );
};

export default App;