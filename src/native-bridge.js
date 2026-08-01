import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

const TASK_KEY = 'nabd_tasks_v1';
const isNative = Capacitor.isNativePlatform();

function toastMessage(message) {
  if (typeof window.toast === 'function') window.toast(message);
  else console.info(message);
}

function notificationId(taskId, kind) {
  const text = `${taskId}:${kind}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash) % 2000000000 + 1;
}

function parseTasks(raw = localStorage.getItem(TASK_KEY)) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

function reminderDates(task) {
  const result = [];
  const now = new Date();
  let taskDay = new Date();
  if (task.deadline) {
    const deadline = new Date(task.deadline);
    if (!Number.isNaN(deadline.getTime())) {
      taskDay = deadline;
      const beforeDeadline = new Date(deadline.getTime() - 15 * 60 * 1000);
      if (beforeDeadline > now) result.push({ kind: 'deadline', at: beforeDeadline, title: 'موعد المهمة يقترب', body: `${task.title} • بقي 15 دقيقة` });
    }
  }
  if (task.time) {
    const [hours, minutes] = task.time.split(':').map(Number);
    const start = new Date(taskDay);
    start.setHours(hours || 0, minutes || 0, 0, 0);
    if (start > now) result.push({ kind: 'start', at: start, title: 'حان وقت المهمة', body: task.title });
  }
  return result;
}

async function requestNotificationPermission() {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

async function rescheduleNotifications(raw) {
  if (!isNative) return;
  const allowed = await requestNotificationPermission();
  if (!allowed) return;

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  }

  const tasks = parseTasks(raw).filter(task => task.status !== 'done');
  const notifications = [];
  tasks.forEach(task => {
    reminderDates(task).forEach(reminder => {
      notifications.push({
        id: notificationId(task.id, reminder.kind),
        title: reminder.title,
        body: reminder.body,
        schedule: { at: reminder.at, allowWhileIdle: true },
        extra: { taskId: task.id, kind: reminder.kind },
      });
    });
  });
  if (notifications.length) await LocalNotifications.schedule({ notifications });
}

async function setupNative() {
  if (!isNative) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#0b7568' });
  } catch { /* not supported on every platform */ }

  const notifyButton = document.getElementById('notifyBtn');
  if (notifyButton) {
    notifyButton.onclick = async () => {
      const allowed = await requestNotificationPermission();
      if (!allowed) return toastMessage('لم يتم منح إذن التنبيهات');
      await rescheduleNotifications();
      notifyButton.textContent = '🔔 مفعّلة';
      toastMessage('تم تفعيل تنبيهات المهام حتى عند إغلاق التطبيق');
    };
  }

  const shareButton = document.getElementById('shareBtn');
  if (shareButton) {
    shareButton.onclick = async () => {
      const text = typeof window.reportText === 'function' ? window.reportText() : 'تقرير نبض التنفيذ';
      await Share.share({ title: 'تقرير نبض التنفيذ', text, dialogTitle: 'مشاركة التقرير' });
    };
  }

  window.addEventListener('nabd:storage', event => {
    if (event.detail?.key === TASK_KEY) rescheduleNotifications(event.detail.value).catch(console.error);
  });

  LocalNotifications.addListener('localNotificationActionPerformed', event => {
    const taskId = event.notification.extra?.taskId;
    if (taskId && typeof window.openDetail === 'function') window.openDetail(taskId);
  });

  App.addListener('appStateChange', state => {
    if (state.isActive) rescheduleNotifications().catch(console.error);
  });

  await rescheduleNotifications();
}

window.addEventListener('DOMContentLoaded', () => setupNative().catch(console.error));
