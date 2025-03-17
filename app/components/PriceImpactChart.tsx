import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PriceImpactChartProps {
  tfIdfResults: TfIdfResult[];
}

export function PriceImpactChart({ tfIdfResults }: PriceImpactChartProps) {
  const data = {
    labels: tfIdfResults.map(result => result.term),
    datasets: [
      {
        label: 'Average Price ($)',
        data: tfIdfResults.map(result => result.averagePrice),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Term Significance (TF-IDF)',
        data: tfIdfResults.map(result => result.tfIdf),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        yAxisID: 'y1'
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Average Price ($)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Term Significance'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Price Impact of Title Keywords'
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const result = tfIdfResults[context.dataIndex];
            return [
              `Term: ${result.term}`,
              `Average Price: $${result.averagePrice.toFixed(2)}`,
              `Frequency: ${result.frequency} listings`,
              `TF-IDF Score: ${result.tfIdf.toFixed(3)}`
            ];
          }
        }
      }
    }
  };

  return (
    <div className="w-full h-[400px]">
      <Bar data={data} options={options} />
    </div>
  );
} 