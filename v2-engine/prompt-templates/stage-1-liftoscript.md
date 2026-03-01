# PARSING THE WORKOUT SCRIPT

The user has provided a raw workout script (such as an exported Liftoscript) below. You must parse this script to define the narrative ARC and pacing of the Zine.

1. **Analyze the Movements:** Map the specific exercises defined in the script to the mechanical/narrative challenges of the game. If the script focuses on Heavy Deadlifts, the narrative challenges should reflect extreme physical strain, pulling, or resisting gravity.
2. **Analyze the Progression:** Identify the intended duration of the program based on the script's progression logic (e.g., how many weeks until a deload or how many total sessions are meant to be performed).
3. **Align the 3-Act Structure:** The narrative pacing (Act 1: Acclimation, Act 2: The Grind, Act 3: The Climax) MUST align with the progression volume and intensity described in the script. The Climax should occur during the heaviest/most difficult weeks of the script.
4. **Diegetic Reference:** Do not mention the script syntax or the name "Liftosaur" in the final Zine output. Translate the mathematical progression into narrative escalation seamlessly.
5. **Generate Workout Logs:** You MUST generate the `workout.sessionTypes[].exercises[]` entries for every single session described in the script. The `exercises[]` list must match the exercises (e.g., `[{ "name": "Squat", "sets": 3, "reps": 5 }]`).
