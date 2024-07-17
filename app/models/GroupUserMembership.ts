import Group from "./Group";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

/**
 * Represents a user's membership in a group.
 */
class GroupUserMembership extends Model {
  static modelName = "GroupUserMembership";

  /**
   * The ID of the user.
   */
  userId: string;

  /**
   * The user that belongs to the group.
   */
  @Relation(() => User, { onDelete: "cascade" })
  user: User;

  /**
   * The ID of the group.
   */
  groupId: string;

  /**
   * The group that the user belongs to.
   */
  @Relation(() => Group, { onDelete: "cascade" })
  group: Group;
}

export default GroupUserMembership;
