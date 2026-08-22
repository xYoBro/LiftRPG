// One dependency-light derivation for the rows the assembly page can actually
// ask a player to fill.  The renderer and the post-assembly materialization
// gate consume this same fact; neither infers an assembly surface from a
// password length or from the unconditional adapter atom.
export function deriveAssemblyTransferRows(data) {
  var weeks = Array.isArray((data || {}).weeks) ? data.weeks : [];
  return weeks.filter(function (week) {
    return week && typeof week === 'object' && !week.isBossWeek
      && Array.isArray(week.sessions) && week.sessions.length > 0;
  }).map(function (week, index) {
    var weekNumber = Number(week.weekNumber);
    if (!Number.isFinite(weekNumber) || weekNumber < 1) weekNumber = index + 1;
    return { weekNumber: weekNumber };
  });
}
