import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import Graph from "./Graph";

const Group = () => {
  const [songs, setSongs] = useState({});
  const [loading, setLoading] = useState(true);
  const [isCheckingSequentially, setIsCheckingSequentially] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [topArtists, setTopArtists] = useState([]);
  const [activeArtistColor, setActiveArtistColor] = useState(null);

  const pauseRef = useRef(false);
  const cancelRef = useRef(false);
  const songRefs = useRef({});

  const { groupName } = useParams();
  const searchParams = new URLSearchParams({ group_name: groupName }).toString();

  /** -------------------- Helpers -------------------- **/
  const getContrastColor = (hexColor) => {
    if (!hexColor.startsWith("#") || (hexColor.length !== 7 && hexColor.length !== 4)) return "#fff";
    if (hexColor.length === 4)
      hexColor = "#" + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2] + hexColor[3] + hexColor[3];
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? "#000" : "#fff";
  };

  const mapSongsArrayToState = (songsArray, artists) =>
    Object.fromEntries(
      songsArray.map((song) => {
        let maxColor = null;
        let maxValue = -Infinity;
        Object.entries(song.line_distribution).forEach(([artistName, value]) => {
          const artist = artists.find((a) => a.name === artistName);
          const artistColor = artist?.color;
          if (!artistColor) return;
          if (Number(value) > maxValue) {
            maxValue = Number(value);
            maxColor = artistColor;
          }
        });
        return [
          song.song_url,
          { ...song, checked: true, highlight: false, maxColor, persistentHighlight: true },
        ];
      })
    );

  const updateSongs = (updates) => setSongs((prev) => ({ ...prev, ...updates }));
  const toggleSong = (songUrl) =>
    updateSongs({ [songUrl]: { ...songs[songUrl], checked: !songs[songUrl].checked } });

  const toggleGroup = (releaseDate, checked, grouped) => {
    const updates = grouped[releaseDate].reduce((acc, song) => {
      acc[song.song_url] = { ...songs[song.song_url], checked };
      return acc;
    }, {});
    updateSongs(updates);
  };

  const toggleAll = () => {
    const allChecked = Object.values(songs).every((song) => song.checked);
    const updates = Object.fromEntries(
      Object.entries(songs).map(([url, song]) => [url, { ...song, checked: !allChecked }])
    );
    setSongs(updates);
  };

  const computeMostCommonAlbum = (songsForDate) => {
    const freq = songsForDate.reduce((acc, song) => {
      const album = song.album || "Unknown Album";
      acc[album] = (acc[album] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(freq).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  };

  const computeAggregateData = (checkedSongs) => {
    if (!checkedSongs.length) return null;
    const freqMap = checkedSongs.reduce((acc, song) => {
      const key = JSON.stringify(song.artists);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const [topArtistsKey] = Object.entries(freqMap).reduce((a, b) => (a[1] >= b[1] ? a : b));
    const topArtists = JSON.parse(topArtistsKey).map((artist) => ({ name: artist.name, color: artist.color }));
    const nameToColor = Object.fromEntries(topArtists.map(({ name, color }) => [name, color]));
    const totalLineDistribution = checkedSongs.reduce((acc, song) => {
      Object.entries(song.line_distribution).forEach(([artistName, value]) => {
        if (nameToColor[artistName]) {
          const color = nameToColor[artistName];
          acc[color] = (acc[color] || 0) + Number(value);
        }
      });
      return acc;
    }, {});
    return {
      line_distribution: Object.fromEntries(
        Object.entries(totalLineDistribution).map(([color, value]) => [
          topArtists.find((a) => a.color === color)?.name || color,
          value,
        ])
      ),
      artists: topArtists,
    };
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /** -------------------- Artist Filter Buttons -------------------- **/
  const checkSongsByArtistColor = (color) => {
    const isSame = activeArtistColor === color;
    const updates = Object.fromEntries(
      Object.entries(songs).map(([url, song]) => [
        url,
        { ...song, checked: !isSame && song.maxColor === color },
      ])
    );
    setSongs(updates);
    setActiveArtistColor(isSame ? null : color);
  };

  /** -------------------- Fetch & Initialize -------------------- **/
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const response = await fetch(
          `https://brygk8u8b9.execute-api.us-east-1.amazonaws.com/dev?${searchParams}`
        );
        const data = await response.json();

        const freqMap = data.body.reduce((acc, song) => {
          const key = JSON.stringify(song.artists);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const [topArtistsKey] = Object.entries(freqMap).reduce((a, b) => (a[1] >= b[1] ? a : b));
        const artists = JSON.parse(topArtistsKey).map((a) => ({ name: a.name, color: a.color }));

        setSongs(mapSongsArrayToState(data.body, artists));

        const colorCounts = {};
        data.body.forEach((song) => {
          let maxValue = -Infinity;
          let maxColor = null;
          Object.entries(song.line_distribution).forEach(([artistName, value]) => {
            const artist = artists.find((a) => a.name === artistName);
            const color = artist?.color;
            if (!color) return;
            if (Number(value) > maxValue) {
              maxValue = Number(value);
              maxColor = color;
            }
          });
          if (maxColor) colorCounts[maxColor] = (colorCounts[maxColor] || 0) + 1;
        });

        const artistsWithCounts = artists.map((a) => ({ ...a, count: colorCounts[a.color] || 0 }));
        artistsWithCounts.sort((a, b) => b.count - a.count);
        setTopArtists(artistsWithCounts);
      } catch (err) {
        console.error("Error fetching group data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [searchParams]);

  /** -------------------- Sequential Check Logic -------------------- **/
  const checkAllSequentially = useCallback(async () => {
    if (isCheckingSequentially) return;
    setIsCheckingSequentially(true);
    pauseRef.current = false;
    cancelRef.current = false;
    setIsPaused(false);

    const urls = Object.keys(songs);
    const total = urls.length;

    // Uncheck all songs initially
    setSongs((prev) =>
      Object.entries(prev).reduce((acc, [url, song]) => {
        acc[url] = { ...song, checked: false };
        return acc;
      }, {})
    );
    setProgress(0);
    await delay(50);

    await urls.reduce(async (prevPromise, url, index) => {
      await prevPromise;
      if (cancelRef.current) return;
      while (pauseRef.current) await delay(100);

      // Highlight using the song's maxColor
      updateSongs({
        [url]: { ...songs[url], checked: true, highlight: true },
      });

      // Auto-scroll highlighted song into view
      if (songRefs.current[url]) {
        songRefs.current[url].scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setProgress(Math.round(((index + 1) / total) * 100));
      await delay(250);

      // Remove temporary highlight
      updateSongs({
        [url]: { ...songs[url], highlight: false },
      });
    }, Promise.resolve());

    setIsCheckingSequentially(false);
    pauseRef.current = false;
    cancelRef.current = false;
    setIsPaused(false);
  }, [songs, isCheckingSequentially]);

  const pauseResume = () => {
    if (!isCheckingSequentially) return;
    pauseRef.current = !pauseRef.current;
    setIsPaused(pauseRef.current);
  };

  const cancel = () => {
    if (!isCheckingSequentially) return;
    cancelRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
    setIsCheckingSequentially(false);
    setProgress(0);
  };

  /** -------------------- Derived State -------------------- **/
  const groupedSongs = useMemo(() => {
    return Object.values(songs).reduce((acc, song) => {
      const date = song.release_date || "Unknown Release Date";
      if (!acc[date]) acc[date] = [];
      acc[date].push(song);
      return acc;
    }, {});
  }, [songs]);

  const checkedSongs = useMemo(() => Object.values(songs).filter((song) => song.checked), [songs]);
  const aggregateData = useMemo(() => computeAggregateData(checkedSongs), [checkedSongs]);
  const allChecked = useMemo(() => Object.values(songs).every((song) => song.checked), [songs]);

  if (loading) return <div className="p-6">Loading songs...</div>;

  /** -------------------- Render -------------------- **/
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h1>{groupName}</h1>

      {/* Controls + Artist Buttons (stacked) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        {/* Global Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={toggleAll}
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: allChecked ? "#f87171" : "#4ade80",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {allChecked ? "Uncheck All" : "Check All"}
          </button>

          {!isCheckingSequentially ? (
            <button
              onClick={checkAllSequentially}
              style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "#60a5fa",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Check All Sequentially
            </button>
          ) : (
            <>
              <button
                onClick={pauseResume}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fbbf24",
                  color: "#000",
                  cursor: "pointer",
                }}
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={cancel}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <div style={{ flex: "1 1 150px", height: "10px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    backgroundColor: "#3b82f6",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span style={{ minWidth: "3ch", fontWeight: "bold" }}>{progress}%</span>
            </>
          )}
        </div>

        {/* Top Artist Buttons (new row) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {topArtists.map((artist) => (
            <button
              key={artist.color}
              onClick={() => checkSongsByArtistColor(artist.color)}
              style={{
                backgroundColor: artist.color,
                color: getContrastColor(artist.color),
                border: activeArtistColor === artist.color ? "2px solid #000" : "none",
                borderRadius: "4px",
                padding: "0.25rem 0.5rem",
                cursor: "pointer",
              }}
            >
              {artist.name} ({artist.count})
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Song List */}
        <div style={{ flex: "0 0 auto", paddingRight: "1rem", overflowY: "auto" }}>
          {Object.entries(groupedSongs).map(([releaseDate, songsForDate]) => {
            const allCheckedGroup = songsForDate.every((song) => song.checked);
            const someChecked = songsForDate.some((song) => song.checked);
            const albumName = computeMostCommonAlbum(songsForDate);

            return (
              <div key={releaseDate} style={{ marginBottom: "1rem" }}>
                <div style={{ fontWeight: "bold" }}>
                  <input
                    type="checkbox"
                    checked={allCheckedGroup}
                    ref={(el) => {
                      if (el) el.indeterminate = !allCheckedGroup && someChecked;
                    }}
                    onChange={(e) => toggleGroup(releaseDate, e.target.checked, groupedSongs)}
                  />
                  <span style={{ marginLeft: "0.5rem" }}>
                    {albumName} ({releaseDate})
                  </span>
                </div>

                {songsForDate.map((song) => (
                  <div
                    key={song.song_url}
                    ref={(el) => (songRefs.current[song.song_url] = el)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginLeft: "1.5rem",
                      cursor: "pointer",
                      backgroundColor: song.highlight
                        ? `${song.maxColor}55` // animated highlight
                        : activeArtistColor && song.maxColor === activeArtistColor
                        ? `${song.maxColor}33` // filtered highlight
                        : song.persistentHighlight
                        ? `${song.maxColor}22` // base persistent highlight
                        : "transparent",
                      transition: "background-color 0.3s",
                    }}
                    onClick={() => toggleSong(song.song_url)}
                  >
                    <input
                      type="checkbox"
                      checked={song.checked}
                      onChange={() => toggleSong(song.song_url)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ marginLeft: "0.5rem" }}>{song.song_name}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Graph */}
        {aggregateData && (
          <div style={{ flex: "1 1 auto", overflow: "hidden" }}>
            <Graph data={aggregateData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Group;
