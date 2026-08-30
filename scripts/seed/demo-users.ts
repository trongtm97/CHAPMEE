export type DemoUserSpec = {
  key: string;
  email: string;
  displayName: string;
  username: string;
  roles: string[];
  profileRole: "user" | "moderator" | "admin" | "founder";
  createCreatorProfile?: boolean;
  penName?: string;
};

/** Default local demo accounts (see LOCAL_SETUP.md). */
export const DEMO_USERS: DemoUserSpec[] = [
  {
    key: "reader",
    email: "reader@chapchap.local",
    displayName: "Demo Reader",
    username: "demoreader",
    roles: ["reader"],
    profileRole: "user"
  },
  {
    key: "creator",
    email: "creator@chapchap.local",
    displayName: "Demo Creator",
    username: "democreator",
    roles: ["creator", "verified_creator"],
    profileRole: "user",
    createCreatorProfile: true,
    penName: "Nhà văn Demo"
  },
  {
    key: "admin",
    email: "admin@chapchap.local",
    displayName: "Demo Admin",
    username: "demoadmin",
    roles: ["admin"],
    profileRole: "founder"
  }
];
