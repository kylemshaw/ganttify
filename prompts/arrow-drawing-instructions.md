# Gantt Chart Arrow Drawing Instructions

This document outlines the rules for drawing dependency arrows between tasks in the Gantt chart.

## Arrow Drawing Rules

1.  **Origin Point**: The arrow must start at the **horizontal center** of the bottom edge of the dependency task's bar.
2.  **Destination Point**: The arrow must end at the **vertical center** of the left edge of the dependent task's bar.
3.  **Orthogonal Lines**: The arrow path must consist of only vertical and horizontal lines.
4.  **Single Turn**: The path must contain exactly one 90-degree turn.
5.  **Path Order**:
    *   The path starts with a vertical line moving downwards from the origin point.
    *   It then makes a single horizontal turn towards the destination task.
6.  **Z-Index**: The arrows must be rendered *behind* the task bars to avoid visual overlap.

## SVG Path Implementation

To implement this, we use an SVG `<path>` element. The `d` attribute for the path can be constructed as follows:

*   `startX`: The horizontal center of the source task bar. `dependencyTask.left + dependencyTask.width / 2`
*   `startY`: The bottom edge of the source task bar. `dependencyTask.top + TASK_BAR_HEIGHT`
*   `endX`: The left edge of the destination task bar. `task.left`
*   `endY`: The vertical center of the destination task bar. `task.top + TASK_BAR_HEIGHT / 2`

The `d` attribute string will be: `M ${startX} ${startY} V ${endY} H ${endX}`

*   `M ${startX} ${startY}`: **M**oves the virtual pen to the starting point.
*   `V ${endY}`: Draws a **V**ertical line down to the Y-coordinate of the destination's center.
*   `H ${endX}`: Draws a **H**orizontal line to the X-coordinate of the destination's left edge, completing the path.