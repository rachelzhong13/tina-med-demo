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
  ],
});

export default router;
