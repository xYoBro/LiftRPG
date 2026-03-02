# PARSING THE WORKOUT INPUT

The user has provided a workout description below. This may be a structured script (e.g., a Liftosaur/Liftoscript export with progression syntax) or a plain-text description (e.g., "Starting Strength, 3 days/week, 6 weeks"). Parse whichever format is present.

1. **Analyze the Intensity Pattern:** Use the program&apos;s intensity curve (heavy vs. light weeks, volume ramps, deload phases) to shape the narrative arc&apos;s tension curve. Heavy weeks should align with peak narrative tension; deload weeks should align with breathing room. Do NOT map specific exercises to narrative events — the workout is real, the story is fiction. They fuse through timing and tension, not literal mapping.
2. **Analyze the Progression:** Identify the intended duration of the program based on the input&apos;s progression logic (e.g., how many weeks until a deload or how many total sessions are meant to be performed). If the input does not specify a duration, default to 6 weeks.
3. **Align the Narrative Arc:** If a wiring blueprint is provided, its `weeklyArc` phases define the structure — follow them. Otherwise, infer phase boundaries from the program&apos;s volume and intensity pattern. The peak narrative intensity should occur during the heaviest training weeks.
4. **Diegetic Reference:** Do not mention script syntax, the name "Liftosaur," or any app-specific terminology in the final Zine output. Translate the program structure into narrative pacing seamlessly.
5. **Generate Workout Logs:** You MUST generate the `workout.sessionTypes[].exercises[]` entries for every session type described in the input. Follow the full schema in the SCHEMA SPECIFICATION section above — include `category`, `protocol`, and `rounds` where applicable.
