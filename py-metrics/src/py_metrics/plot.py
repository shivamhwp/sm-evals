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


def plot_metrics(json_file):
    """Generate bar charts for metrics in the JSON file."""
    # Load the JSON data
    with open(json_file, "r") as f:
        data = json.load(f)

    metrics = data["metrics"]
    dataset_name = data.get("dataset_name", "unknown")

    # Get all cutoffs and metrics
    # Extract cutoffs from first metric's keys
    first_metric = next(iter(metrics.values()))
    cutoffs = [k.split("@")[1] for k in first_metric.keys()]
    metric_names = list(metrics.keys())

    # Create a single figure with higher quality settings
    fig, ax = plt.subplots(figsize=(14, 9), constrained_layout=True)
    fig.suptitle(
        f"Evaluation Metrics for {dataset_name.capitalize()} Dataset",
        fontsize=18,
        fontweight="bold",
        y=0.98,
    )

    # Set width of bars and positions
    bar_width = 0.18
    index = np.arange(len(cutoffs))

    # Define high-quality color palette
    colors = ["#3274A1", "#E1812C", "#3A923A", "#C03D3E"]

    # Plot bars for each metric
    for i, metric_name in enumerate(metric_names):
        metric_values = metrics[metric_name]
        keys = list(metric_values.keys())
        values = [metric_values[keys[j]] * 100 for j in range(len(cutoffs))]

        pos = index + (i - len(metric_names) / 2 + 0.5) * bar_width
        bars = ax.bar(
            pos,
            values,
            bar_width,
            label=metric_name.upper(),
            color=colors[i],
            alpha=0.85,
            edgecolor="black",
            linewidth=0.8,
            zorder=3,
        )  # Put bars above grid

        # Add value labels on top of each bar with shadow effect
        for bar in bars:
            height = bar.get_height()
            # Text with slight shadow for better readability
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

    # Add labels, title, and legend with enhanced styling
    ax.set_xlabel("Cutoff Point", fontweight="bold", labelpad=10)
    ax.set_ylabel("Score (%)", fontweight="bold", labelpad=10)
    ax.set_xticks(index)
    ax.set_xticklabels(cutoffs, fontweight="bold")
    ax.set_ylim(0, 105)  # Leave room for percentage labels

    # Create legend with custom styling
    legend = ax.legend(
        loc="upper right",
        frameon=True,
        fancybox=True,
        shadow=True,
        fontsize=11,
        title="METRICS",
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

    # Add a descriptive subtitle
    ax.text(
        0.5,
        0.98,
        f"Comparison of retrieval metrics at different cutoff points",
        ha="center",
        va="top",
        transform=ax.transAxes,
        fontsize=12,
        fontstyle="italic",
        alpha=0.8,
    )

    # Add annotations
    max_metric = max(metric_names, key=lambda m: max(metrics[m].values()))
    ax.annotate(
        f"Highest values from: {max_metric.upper()}",
        xy=(0.98, 0.02),
        xycoords="axes fraction",
        ha="right",
        va="bottom",
        fontsize=9,
        bbox=dict(boxstyle="round,pad=0.5", fc="white", ec="gray", alpha=0.8),
    )

    plt.tight_layout()

    # Save the figure in plots directory with high quality
    plots_dir = "plots"
    if not os.path.exists(plots_dir):
        os.makedirs(plots_dir)

    output_filename = os.path.basename(json_file).replace(".json", "_hq.png")
    output_path = os.path.join(plots_dir, output_filename)
    plt.savefig(output_path, bbox_inches="tight", pad_inches=0.3)
    print(f"High-quality plot saved to {output_path}")

    # Display the plot
    plt.show()


def main():
    parser = argparse.ArgumentParser(
        description="Plot evaluation metrics from a JSON file"
    )
    parser.add_argument(
        "json_file", help="Path to the JSON file containing evaluation metrics"
    )
    args = parser.parse_args()

    if not os.path.exists(args.json_file):
        print(f"Error: File {args.json_file} not found", file=sys.stderr)
        sys.exit(1)

    plot_metrics(args.json_file)


if __name__ == "__main__":
    main()
