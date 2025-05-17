#!/usr/bin/env python3
import json
import matplotlib.pyplot as plt
import argparse
import os
import sys
import numpy as np
from matplotlib import rcParams

# Set high-quality plot parameters
plt.style.use("seaborn-v0_8-whitegrid")
rcParams["figure.dpi"] = 300
rcParams["savefig.dpi"] = 600
rcParams["font.family"] = "sans-serif"
rcParams["font.sans-serif"] = ["Inter"]
rcParams["axes.labelsize"] = 12
rcParams["axes.titlesize"] = 14
rcParams["xtick.labelsize"] = 11
rcParams["ytick.labelsize"] = 11
rcParams["legend.fontsize"] = 10
rcParams["figure.titlesize"] = 16
rcParams["lines.linewidth"] = 2.0
rcParams["axes.linewidth"] = 1.5
rcParams["xtick.major.width"] = 1.5
rcParams["ytick.major.width"] = 1.5


def compare_metrics(json_file1, json_file2):
    """Generate bar charts comparing metrics from two JSON files."""
    # Load the JSON data
    with open(json_file1, "r") as f:
        data1 = json.load(f)

    with open(json_file2, "r") as f:
        data2 = json.load(f)

    # Check if 'metrics' key exists in the loaded data
    if "metrics" not in data1:
        print(f"Error: 'metrics' key not found in {json_file1}", file=sys.stderr)
        sys.exit(1)
    if "metrics" not in data2:
        print(f"Error: 'metrics' key not found in {json_file2}", file=sys.stderr)
        sys.exit(1)

    metrics1 = data1["metrics"]
    metrics2 = data2["metrics"]

    # Derive model names from filenames
    model_name1 = "supermemory"
    model_name2 = "major memory provider"

    # Specific metrics to compare, matching keys in the JSON files
    target_metrics = {
        "P@1": "precision",  # Display key maps to outer JSON key
        "Recall@10": "recall",
        "NDCG@10": "ndcg",
        "MAP@10": "map",
    }

    # Create a single figure with higher quality settings
    fig, ax = plt.subplots(figsize=(14, 9), constrained_layout=True)
    fig.suptitle(
        f"Comparison of Evaluation Metrics: {model_name1} vs {model_name2}",  # Updated title
        fontsize=18,
        fontweight="bold",
        y=0.98,
    )

    # Set width of bars and positions
    bar_width = 0.35
    index = np.arange(len(target_metrics))

    # Define high-quality color palette
    colors = ["#3274A1", "#E1812C"]
    #  colors = ["#036AF0", "#C3F4FF"] similar to brands colors
    # Extract values for the specific metrics
    values1 = []
    values2 = []

    # target_metrics maps: "display_key_for_plot_and_inner_json_key" -> "outer_json_key_for_metric_type"
    # e.g., "P@1" (display_key) maps to "precision" (outer_json_key)
    for display_key, outer_json_key in target_metrics.items():
        # For dataset 1 (model_name1)
        metric_value1 = 0.0  # Default to 0.0 if key is not found
        if outer_json_key in metrics1 and isinstance(metrics1[outer_json_key], dict):
            # metrics1[outer_json_key] is the dictionary like metrics1["precision"]
            # display_key is the specific metric key like "P@1"
            metric_value1 = metrics1[outer_json_key].get(display_key, 0.0) * 100
        values1.append(metric_value1)

        # For dataset 2 (model_name2)
        metric_value2 = 0.0  # Default to 0.0 if key is not found
        if outer_json_key in metrics2 and isinstance(metrics2[outer_json_key], dict):
            # metrics2[outer_json_key] is the dictionary like metrics2["precision"]
            # display_key is the specific metric key like "P@1"
            metric_value2 = metrics2[outer_json_key].get(display_key, 0.0) * 100
        values2.append(metric_value2)

    # Plot bars for each dataset
    bars1 = ax.bar(
        index - bar_width / 2,
        values1,
        bar_width,
        label=f"{model_name1}",  # Updated label
        color=colors[0],
        alpha=0.85,
        edgecolor="black",
        linewidth=0.8,
        zorder=3,
    )

    bars2 = ax.bar(
        index + bar_width / 2,
        values2,
        bar_width,
        label=f"{model_name2}",  # Updated label
        color=colors[1],
        alpha=0.85,
        edgecolor="black",
        linewidth=0.8,
        zorder=3,
    )

    # Add value labels on top of each bar
    def add_labels(bars):
        for bar in bars:
            height = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2.0,
                height + 1.5,
                f"{height:.1f}%",
                ha="center",
                va="bottom",
                fontsize=9,
                fontweight="bold",
                color="black",
                zorder=10,
            )

    add_labels(bars1)
    add_labels(bars2)

    # Add labels, title, and legend with enhanced styling
    ax.set_xlabel("Metrics", fontweight="bold", labelpad=10)
    ax.set_ylabel("Score (%)", fontweight="bold", labelpad=10)
    ax.set_xticks(index)
    ax.set_xticklabels(list(target_metrics.keys()), fontweight="bold")
    ax.set_ylim(0, 105)  # Leave room for percentage labels

    # Create legend with custom styling
    legend = ax.legend(
        loc="upper right",
        frameon=True,
        fancybox=True,
        shadow=True,
        fontsize=11,
        title="Providers",  # Updated legend title
        title_fontsize=12,
    )

    # Add border to the plot
    for spine in ax.spines.values():
        spine.set_linewidth(1.2)
        spine.set_visible(True)

    # Add grid for better readability
    ax.grid(axis="y", linestyle="--", alpha=0.7, zorder=0)

    # Add a subtle background color
    ax.set_facecolor("#F8F8F8")

    plt.tight_layout()

    # Save the figure in plots directory with high quality
    plots_dir = "./plots/compare-plots"
    if not os.path.exists(plots_dir):
        os.makedirs(plots_dir)

    output_filename = f"comparison_{os.path.basename(json_file1).split('.')[0]}_{os.path.basename(json_file2).split('.')[0]}.png"
    output_path = os.path.join(plots_dir, output_filename)
    plt.savefig(output_path, bbox_inches="tight", pad_inches=0.3)
    print(f"Comparison plot saved to {output_path}")

    # Display the plot
    plt.show()


def main():
    parser = argparse.ArgumentParser(
        description="Compare evaluation metrics from two JSON files"
    )
    parser.add_argument(
        "json_file1", help="Path to the first JSON file containing evaluation metrics"
    )
    parser.add_argument(
        "json_file2", help="Path to the second JSON file containing evaluation metrics"
    )
    args = parser.parse_args()

    if not os.path.exists(args.json_file1):
        print(f"Error: File {args.json_file1} not found", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(args.json_file2):
        print(f"Error: File {args.json_file2} not found", file=sys.stderr)
        sys.exit(1)

    compare_metrics(args.json_file1, args.json_file2)


if __name__ == "__main__":
    main()
