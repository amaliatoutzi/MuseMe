## concept **UserPreferences** [User, Tag]

**purpose**  
store durable taste tags for ranking and cold-start for individual users.

**principle**  
if a **Preference(user, tag)** exists, then ranking functions may treat that tag as an enduring positive signal for **user** until removed. The validity of the `tag` ID itself is guaranteed by the calling context.

**state**  
a set of **Preferences** with  
- a user **User**  
- a tag **Tag**  
- a createdAt **DateTime**

**actions**  
**addPreference**(user: User, tag: Tag) : Empty | { error: String }  
- requires user exists, tag is a valid tag ID (externally verified), and **Preferences(user, tag)** not present  
- effects create **Preferences(user, tag, createdAt := now)**

**removePreference**(user: User, tag: Tag) : Empty | { error: String }  
- requires **Preferences(user, tag)** exists  
- effects delete that **Preferences**

**queries**  
**PreferencesByUser**(user: User) : (tag: Tag)  
- effects return every tag currently preferred by `user`

**UsersByPreference**(tag: Tag) : (user: User)  
- effects return every user that has recorded a preference for `tag`
