import { useState } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [groupNames, setGroupNames] = useState([]);
  fetch('https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev')
    .then(response => response.json())
    .then(data => setGroupNames(data.body))

  return (
    <div className="p-6">
      <ul className="list-disc pl-6">
        {groupNames.map((groupName) => (
          <li key={groupName}>
            <Link to={`/k-line-distribution/${groupName.replace('/', '%2F')}`} className="text-blue-600 hover:underline">
              {groupName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;