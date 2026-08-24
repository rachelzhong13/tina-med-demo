<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { createSession, getHistory, getMedicine, sendChat } from "../api/client";
import type { ChatMessage, Medicine } from "../types";

const route = useRoute();
const medicineId = String(route.params.id);
const medicine = ref<Medicine | null>(null);
const sessionId = ref("");
const messages = ref<ChatMessage[]>([]);
const draft = ref("");
const loading = ref(true);
const sending = ref(false);
const error = ref("");
const messageList = ref<HTMLElement | null>(null);

const sessionKey = `tina-session-${medicineId}`;
const quickQuestions = ["这个演示药品主要展示什么？", "有什么需要注意的？", "资料来源是什么？"];

async function scrollToBottom() {
  await nextTick();
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight;
}

async function loadSession() {
  const saved = localStorage.getItem(sessionKey);
  if (saved) {
    try {
      const history = await getHistory(saved);
      sessionId.value = history.session_id;
      messages.value = history.messages;
      return;
    } catch {
      localStorage.removeItem(sessionKey);
    }
  }
  const session = await createSession(medicineId);
  sessionId.value = session.session_id;
  localStorage.setItem(sessionKey, session.session_id);
}

async function send(message = draft.value) {
  const content = message.trim();
  if (!content || sending.value || !sessionId.value) return;
  draft.value = "";
  error.value = "";
  messages.value.push({ role: "user", content, created_at: new Date().toISOString() });
  sending.value = true;
  await scrollToBottom();
  try {
    const response = await sendChat(medicineId, sessionId.value, content);
    messages.value.push({ role: "assistant", content: response.answer, created_at: response.created_at });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "AI 服务暂时不可用，请稍后重试。";
  } finally {
    sending.value = false;
    await scrollToBottom();
  }
}

onMounted(async () => {
  try {
    medicine.value = await getMedicine(medicineId);
    await loadSession();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Chat 页面加载失败";
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
});
</script>

<template>
  <p v-if="loading" class="state-card">正在准备 Chat 会话…</p>
  <p v-else-if="!medicine" class="state-card error-card">{{ error || "药品不存在" }}</p>
  <section v-else class="chat-layout">
    <div class="chat-header">
      <div>
        <RouterLink class="back-link" :to="{ name: 'medicine', params: { id: medicine.id } }">← 返回药品详情</RouterLink>
        <p class="eyebrow">AI MEDICINE ASSISTANT</p>
        <h1>{{ medicine.name }}</h1>
      </div>
      <span class="demo-badge">DEMO CONTEXT</span>
    </div>

    <div class="notice">你正在咨询：{{ medicine.name }}。回答仅基于当前页面提供的资料。</div>
    <div ref="messageList" class="message-list">
      <div v-if="messages.length === 0" class="empty-chat">
        <strong>从一个问题开始</strong>
        <p>试试下面的快捷问题，查看当前药品上下文如何进入 AI Chat。</p>
      </div>
      <article v-for="(message, index) in messages" :key="`${message.created_at}-${index}`" class="message" :class="message.role">
        <span class="message-role">{{ message.role === 'user' ? '你' : 'TINA AI' }}</span>
        <p>{{ message.content }}</p>
      </article>
      <div v-if="sending" class="message assistant typing">TINA AI 正在读取当前资料…</div>
    </div>

    <p v-if="error" class="inline-error">{{ error }}</p>
    <div class="quick-questions">
      <button v-for="question in quickQuestions" :key="question" type="button" @click="send(question)">{{ question }}</button>
    </div>
    <form class="chat-form" @submit.prevent="send()">
      <textarea v-model="draft" rows="2" placeholder="请输入关于当前药品的问题…" @keydown.enter.exact.prevent="send()"></textarea>
      <button class="primary-button" type="submit" :disabled="sending || !draft.trim()">{{ sending ? "回答中…" : "发送" }}</button>
    </form>
  </section>
</template>
