import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import Graph from "./Graph";

const Group = () => {
  const [songs, setSongs] = useState({});
  const [artists, setArtists] = useState([]);
  const [currSong, setCurrSong] = useState(null);

  const { groupName } = useParams();
  const searchParams = new URLSearchParams({ group_name: groupName }).toString();

  // Fetch group data
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await fetch(
          `https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev?${searchParams}`
        );
        const data = await response.json();
        initializeState(data.body, data.artists);
      } catch (err) {
        console.error("Error fetching group data:", err);
      }
    };

    fetchGroupData();
  }, [searchParams]);

  // Toggle song checkbox
  const handleChange = useCallback((songUrl) => {
    setSongs((prev) => ({
      ...prev,
      [songUrl]: { ...prev[songUrl], checked: !prev[songUrl].checked },
    }));
  }, []);

  // Initialize state from API data
  const initializeState = (songsArray, artistsArray) => {
    const songsMap = Object.fromEntries(
      songsArray.map((song) => [song.song_url, { ...song, checked: true }])
    );
    setSongs(songsMap);
    setArtists(artistsArray);

    const colorMap = Object.fromEntries(
      artistsArray.map(({ name, color }) => [color, name])
    );

    const totalLineDistribution = Object.values(songsMap).reduce((acc, song) => {
      const nameToColor = Object.fromEntries(
        song.artists.map(({ name, color }) => [name, color])
      );

      Object.entries(song.line_distribution).forEach(([artistName, value]) => {
        const color = nameToColor[artistName];
        if (color in colorMap) {
          acc[color] = (acc[color] || 0) + Number(value);
        }
      });

      return acc;
    }, {});

    setCurrSong({
      line_distribution: Object.fromEntries(
        Object.entries(totalLineDistribution).map(([color, value]) => [
          colorMap[color],
          value,
        ])
      ),
      artists: artistsArray,
    });
  };

  // Group songs by release_date
  const groupedSongs = useMemo(() => {
    return Object.values(songs).reduce((acc, song) => {
      const date = song.release_date || "Unknown Release Date";
      if (!acc[date]) acc[date] = [];
      acc[date].push(song);
      return acc;
    }, {});
  }, [songs]);

  return (
    <div style={{ display: "flex" }}>
      {/* Song List */}
      <div style={{ flex: 1 }}>
        <h1>{groupName}</h1>
        {Object.entries(groupedSongs).map(([releaseDate, songsForDate]) => (
          <div key={releaseDate} style={{ marginBottom: "1rem" }}>
            <h3>{releaseDate}</h3>
            {songsForDate.map((song) => (
              <label
                key={song.song_url}
                style={{ display: "block" }}
                onClick={() => setCurrSong(song)}
              >
                <input
                  type="checkbox"
                  checked={song.checked}
                  onChange={() => handleChange(song.song_url)}
                />
                {song.song_name}
              </label>
            ))}
          </div>
        ))}
      </div>

      {/* Current Song Graph */}
      {currSong && (
        <div style={{ flex: 1, textAlign: "center" }}>
          <a href={currSong.song_url} target="_blank" rel="noopener noreferrer">
            <h2>{currSong.song_name}</h2>
          </a>
          <Graph data={currSong} />
        </div>
      )}
    </div>
  );
};

export default Group;