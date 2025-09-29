import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";

const Graph = ({ data }) => {
  const { line_distribution: lineDist, artists } = data;

  const totalSyllables = Object.values(lineDist).reduce(
    (sum, value) => sum + Number(value),
    0
  );

  const formatPercentage = (value) =>
    `${Math.floor((value / totalSyllables) * 100)}%`;

  const graphData = artists.map(({ name, color }) => ({
    label: name,
    color,
    value: lineDist[name],
  }));

  const sortedGraphData = [...graphData].sort((a, b) => b.value - a.value);

  return (
    <div>
      <PieChart
        series={[
          {
            data: graphData,
            valueFormatter: ({ value }) => formatPercentage(value),
          },
        ]}
        width={700}
        height={700}
      />
      <BarChart
        series={[
          {
            data: sortedGraphData.map(({ value }) => value),
            valueFormatter: (value) => formatPercentage(value),
          },
        ]}
        yAxis={[
          {
            data: sortedGraphData.map(({ label }) => label),
            colorMap: {
              type: "ordinal",
              colors: sortedGraphData.map(({ color }) => color),
            },
          },
        ]}
        width={1400}
        height={700}
        layout="horizontal"
        order="ascending"
      />
    </div>
  );
};

export default Graph;