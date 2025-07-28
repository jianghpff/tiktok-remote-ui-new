// 【注意】此处的JavaScript代码与之前版本完全相同，无需修改
const API_BASE_URL = 'https://tiktok-reply-worker.1170731839.workers.dev';

const taskContainer = document.getElementById('task-container');
const replyArea = document.getElementById('reply-area');
const replyText = document.getElementById('reply-text');
const submitButton = document.getElementById('submit-reply');

let currentTask = null;
let pollingInterval = null;

function resetUI() {
    currentTask = null;
    taskContainer.innerHTML = '<div id="status">正在等待PC端发送任务...</div>';
    replyArea.style.display = 'none';
    replyText.value = '';
    if (!pollingInterval) {
        pollingInterval = setInterval(fetchTask, 2000);
    }
}

async function fetchTask() {
    const statusElement = taskContainer.querySelector('#status');
    if (statusElement) statusElement.textContent = '正在检查任务...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/task`);
        const data = await response.json();

        if (data.success && data.task) {
            if (!currentTask || currentTask.id !== data.task.id) {
                currentTask = data.task;
                renderConversation(currentTask);
                replyArea.style.display = 'block';
                if(pollingInterval) clearInterval(pollingInterval);
                pollingInterval = null;
            }
        } else {
            if (currentTask) {
                alert('当前任务已被PC端处理或作废，无需回复。');
            }
            resetUI();
        }
    } catch (error) {
        console.error('Error fetching task:', error);
        if (statusElement) statusElement.textContent = '获取任务失败，请检查网络和API地址。';
    }
}

function renderConversation(task) {
    taskContainer.innerHTML = '';
    task.conversation.forEach(msg => {
        if (!msg.content || msg.content === '[Unrecognized]') return;
        const messageEntry = document.createElement('div');
        messageEntry.className = 'message-entry';
        const speakerInfo = document.createElement('div');
        speakerInfo.className = 'speaker-info';
        speakerInfo.textContent = `${msg.speaker} - ${msg.time}`;
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        if (msg.content.startsWith('[Image/Sticker]:')) {
            const url = msg.content.substring(msg.content.indexOf(':') + 2);
            const img = document.createElement('img');
            img.src = url;
            img.className = 'chat-image';
            messageBubble.appendChild(img);
        } else if (msg.content.startsWith('[Product Card]') || msg.content.startsWith('[Sample Request]')) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-content';
            const imageUrlMatch = msg.content.match(/Image: (https?:\/\/[^\s]+)/);
            const textContent = msg.content.replace(/Image: (https?:\/\/[^\s]+)\n?/, '');
            cardDiv.textContent = textContent;
            if (imageUrlMatch && imageUrlMatch[1]) {
                const img = document.createElement('img');
                img.src = imageUrlMatch[1];
                cardDiv.appendChild(img);
            }
            messageBubble.appendChild(cardDiv);
        } else {
            messageBubble.textContent = msg.content;
        }
        if (msg.speaker && msg.speaker.includes('Me')) {
            messageEntry.classList.add('message-me');
        } else {
            messageEntry.classList.add('message-creator');
        }
        messageEntry.appendChild(speakerInfo);
        messageEntry.appendChild(messageBubble);
        taskContainer.appendChild(messageEntry);
    });
    taskContainer.scrollTop = taskContainer.scrollHeight;
}

submitButton.addEventListener('click', async () => {
    if (!currentTask || !replyText.value.trim()) { alert('请输入回复内容！'); return; }
    try {
        submitButton.disabled = true;
        submitButton.textContent = '发送中...';
        const response = await fetch(`${API_BASE_URL}/api/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: replyText.value.trim(), taskId: currentTask.id })
        });
        if (response.status === 409) {
            alert('发送失败！PC端的任务已变更或被手动处理，请刷新查看最新任务。');
            resetUI();
            fetchTask();
            return;
        }
        const data = await response.json();
        if (data.success) {
            console.log('回复成功！PC端将自动发送。');
            resetUI();
        } else { throw new Error(data.message || 'Unknown error'); }
    } catch (error) {
        console.error('Error submitting reply:', error);
        alert('回复失败，请重试！');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '发送回复';
    }
});

fetchTask();
pollingInterval = setInterval(fetchTask, 2000);