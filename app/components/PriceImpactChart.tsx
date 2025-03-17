import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import React from 'react';

// Import TfIdfResult interface or define it here
interface TfIdfResult {
  term: string;
  tfIdf: number;
  averagePrice: number;
  frequency: number;
}

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

export function PriceImpactChart({ tfIdfResults }: PriceImpactChartProps): React.ReactElement {
  // Properly type the chart data
  const data: ChartData<'bar'> = {
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

  // Properly type the chart options
  const options: ChartOptions<'bar'> = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Average Price ($)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
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
          label: (context: TooltipItem<'bar'>) => {
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