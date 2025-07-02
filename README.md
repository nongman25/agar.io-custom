# Agar.io Custom game

This project is a web-based game inspired by the popular online multiplayer game Agar.io. It's built using HTML5 Canvas and JavaScript, demonstrating fundamental game development concepts like object-oriented programming, 2D physics, and rendering.

## Key Features

- **Cell Movement & Growth:** Control your cell with the mouse and consume food pellets to grow larger.
- **Splitting Mechanic:** Press the `Spacebar` to split your cell into smaller pieces, allowing for strategic plays.
- **Cell Merging:** After a cooldown period, your separated cells will automatically merge back together upon contact.
- **Viruses:** Avoid the green, spiky viruses! If your cell is large enough, hitting a virus will cause it to shatter into multiple smaller pieces, but with a slight mass increase.
- **Dynamic Camera:** The camera smoothly zooms and pans to keep all your cells in view.
- **Score Tracking:** Your total mass is displayed as a score in the top-left corner.

## How to Play

1.  **Start the game:** Open the `index.html` file in your web browser.
2.  **Enter your name:** Type your desired player name and click "Play".
3.  **Control your cell:** Move your mouse to direct your cell around the map.
4.  **Grow:** Consume the small, colorful food pellets scattered around the map to increase your mass.
5.  **Split:** Press the `Spacebar` to split your cells. This can be used to cover more ground, or to launch a piece of your cell forward.
6.  **Avoid Viruses:** Steer clear of the green viruses, especially when you are large. Colliding with one will make you vulnerable.

## Development Process

This project was developed iteratively, focusing on building a solid foundation and then adding features incrementally.

1.  **Initial Setup:** The project started with a basic HTML structure and a canvas element. The initial JavaScript focused on setting up the game loop and rendering a single player-controlled cell.

2.  **Core Mechanics:** The next step was to implement the core gameplay mechanics:
    *   Food pellets were added, and the logic for the player to "eat" them and grow was implemented.
    *   The player's movement was refined to be smooth and intuitive.

3.  **Advanced Features:** With the core mechanics in place, more advanced features from the original Agar.io were added:
    *   The **cell splitting** mechanic (`Spacebar`) was implemented, including the physics of ejecting the new cell.
    *   A **merge cooldown** system was introduced to prevent instant re-merging of split cells, adding a layer of strategy.
    *   **Viruses** were added as a new entity. The logic to "pop" a large cell on collision and split it into smaller pieces was a key challenge.

4.  **Refactoring and Structuring:** As the codebase grew, it became necessary to refactor the code for better organization and maintainability.
    *   The code was encapsulated within an Immediately Invoked Function Expression (IIFE) to avoid polluting the global namespace.
    *   Object-oriented principles were applied more strictly, with classes for `PlayerCell`, `Food`, `Virus`, and a `Camera` to manage the view.

5.  **Polishing:** The final stage involved polishing the game:
    *   A simple start screen was added to allow players to enter their name.
    *   The camera logic was improved to smoothly follow and zoom based on the player's cells.
    *   UI elements like the score display were added.
