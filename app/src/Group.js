import { useState } from 'react';
import { useParams } from 'react-router-dom';

const Group = () => {
  const [songNames, setSongNames] = useState([]);
  const { groupName } = useParams()
  const searchParams = new URLSearchParams({
    'group_name': groupName
  }).toString()
  
  fetch('https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev?' + searchParams)
    .then(response => response.json())
    .then(data => setSongNames(data.body))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4"> {groupName} </h1>
      <ul className="list-disc pl-6">
        {songNames.map((songName) => (
          <li key={songName}> {songName} </li>
        ))}
      </ul>
    </div>
  );
};

export default Group;