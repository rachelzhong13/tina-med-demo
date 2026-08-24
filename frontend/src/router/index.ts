import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/medicine/:id",
      name: "medicine",
      component: () => import("../views/MedicineDetailView.vue"),
    },
    {
      path: "/medicine/:id/chat",
      name: "chat",
      component: () => import("../views/ChatView.vue"),
    },
  ],
});

export default router;
