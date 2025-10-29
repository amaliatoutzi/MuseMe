## concept **Profile** [User]

**purpose**
store minimal user profile details for display

**principle**
- a user can add their first and last name when creating their profile; hey cannot edit it in the future n
- a user can optionally add a profile picture (through URL) and may be added, edited, or removed independently of name

**state**
a set of **Profile** with
- an owner **User**
- a firstName **String**
- a lastName **String**
- an optional profilePictureUrl **String**
- a createdAt **DateTime**
- an updatedAt **DateTime**

**actions**
**addName**(user: User, firstName: String, lastName: String)
- requires no name has been set for this user yet
- effects if no Profile(owner := user) exists, create it; set **firstName** and **lastName**; set **createdAt := now** (if created) and **updatedAt := now**

**addProfilePicture**(user: User, url: String)
- requires none
- effects if no Profile(owner := user) exists, create it; set **profilePictureUrl := url**; set **createdAt := now** (if created) and **updatedAt := now**

**editProfilePicture**(user: User, url: String)
- requires Profile(owner := user).profilePictureUrl exists and user Exists
- effects set **profilePictureUrl := url**; set **updatedAt := now**

**removeProfilePicture**(user: User)
- requires Profile(owner := user).profilePictureUrl exists and User exists
- effects remove **profilePictureUrl** (unset it); set **updatedAt := now**

**queries**
**Profile?**(user: User) : (profile: Profile)
- effects return the Profile for **user** if it exists (with whatever fields have been added), otherwise return nothing
