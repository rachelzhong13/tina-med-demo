import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

const DEFAULT_MEDICINE_ID = "medicine-001";

const routes: RouteRecordRaw[] = [
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
];

if (
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_DESIGN_REVIEW === "true"
  ) {
  routes.splice(-1, 0, {
    path: "/design-review",
    name: "design-review",
    component: () => import("../views/DesignReviewView.vue"),
  });
}

const useHashHistory = import.meta.env.VITE_ROUTER_MODE === "hash";

const router = createRouter({
  history: useHashHistory
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
