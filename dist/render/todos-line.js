/**
 * CodeBuddy HUD - Task Progress Line Renderer
 *
 * Renders a line showing task completion progress.
 *
 * Compact:  ▸ Fix auth bug (3/7)
 * Expanded: Tasks: ███████░ 3/7 │ ▸ Fix auth bug
 */
import { colorize, dim, coloredBar } from './colors.js';
import { getStrings, t } from '../i18n.js';
/**
 * Render the task progress line.
 */
export function renderTodosLine(ctx) {
    const { transcript, config } = ctx;
    if (!transcript || !config.display.showTodosLine)
        return null;
    const { taskProgress } = transcript;
    // Only show when tasks exist
    if (taskProgress.total === 0)
        return null;
    const colors = config.colors;
    const s = getStrings(config.language);
    const parts = [];
    // Progress indicator: completed / total
    const progressStr = `${taskProgress.completed}/${taskProgress.total}`;
    // Mini progress bar
    const percent = taskProgress.total > 0
        ? Math.round((taskProgress.completed / taskProgress.total) * 100)
        : 0;
    const bar = coloredBar(percent, 8, {
        color: colors.taskProgress,
        warningColor: 'yellow',
        criticalColor: 'red',
        warningThreshold: 70,
        criticalThreshold: 90,
    });
    parts.push(`${bar} ${colorize(progressStr, colors.taskProgress)}`);
    // Show active (in-progress) task subjects
    if (taskProgress.activeSubjects.length > 0) {
        const subjects = taskProgress.activeSubjects.slice(0, 2);
        for (const subject of subjects) {
            parts.push(colorize(`▸ ${subject}`, colors.taskProgress));
        }
        if (taskProgress.inProgress > 2) {
            parts.push(dim(t(s.taskMore, { n: taskProgress.inProgress - 2 })));
        }
    }
    // Expanded layout: prefix with localized label
    if (config.lineLayout === 'expanded') {
        return dim(`${s.tasksLabel}: `) + parts.join(' │ ');
    }
    return parts.join(' │ ');
}
//# sourceMappingURL=todos-line.js.map