import { Link } from 'react-router-dom';

const response = await fetch('https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev')
const res = await response.json()
var groupNames = res.body

const Home = () => {
  return (
    <div className="p-6">
      <ul className="list-disc pl-6">
        {groupNames.map((groupName) => (
          <li key={groupName}>
            <Link to={`/k-line-distribution/${groupName}`} className="text-blue-600 hover:underline">
              {groupName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;