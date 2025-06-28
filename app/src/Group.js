import { useState } from 'react';
import { useParams } from 'react-router-dom';

const Group = () => {
  const [songNames, setSongNames] = useState([]);
  const { groupName } = useParams()
  const searchParams = new URLSearchParams({
    'group_name': groupName
  }).toString()

  const [checkedSongNames, setCheckedSongNames] = useState(
    songNames.reduce((acc, songName) => ({ ...acc, [songName]: false }), {})
  );

  const handleChange = (event) => {
    const { songName, checked } = event.target;
    setCheckedSongNames((prevState) => ({
      ...prevState,
      [songName]: checked,
    }));
  };

  
  fetch('https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev?' + searchParams)
    .then(response => response.json())
    .then(data => setSongNames(data.body))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4"> {groupName} </h1>
      {songNames.map((songName) => (
        <label key={songName} className="block">
          <input
            type="checkbox"
            name={songName}
            checked={checkedSongNames[songName]}
            onChange={handleChange}
            className="mr-2"
          />
          {songName}
          <br/>
        </label>
      ))}
    </div>
  );
};

export default Group;