## concept **UserAuthentication** [User]

**purpose**  
limit access to known users

**principle**  
after a user registers with a username and a password, they can authenticate with the same username+password and be treated as the same user.

**state**  
a set of **Credentials** with  
- an owner **User**  
- a username **String** *(unique)*  
- a passwordHash **Hash**  
- a createdAt **DateTime**  
- an updatedAt **DateTime**

**actions**  
**register**(username: String, password: String) : { user: User } | { error: String }  
- requires no existing **Credentials** with this username  
- effects create **Credentials(owner := new User, username, passwordHash := hash(password), createdAt := now, updatedAt := now)**; return `owner`

**authenticate**(username: String, password: String) : { user: User } | { error: String }  
- requires **Credentials(username)** exists and `verifyHash(password, passwordHash)`  
- effects none
