import { createRouter, createWebHistory } from "vue-router";

const DEFAULT_MEDICINE_ID = "medicine-001";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: { name: "medicine", params: { id: DEFAULT_MEDICINE_ID } },
    },
    {
      path: "/medicine/:id",
      name: "medicine",
      component: () => import("../views/MedicineDetailView.vue"),
    },
    {
      path: "/medicine/:id/chat",
      redirect: (to) => ({ name: "medicine", params: { id: to.params.id } }),
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "medicine", params: { id: DEFAULT_MEDICINE_ID } },
    },
  ],
});

export default router;
