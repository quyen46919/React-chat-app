const User = require("../models/User");
const router = require("express").Router();
const bcrypt = require("bcrypt");
const mongoose = require('mongoose');
const Conversation = require("../models/Conversation");

//get user
router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  res.status(200).send(user);
});

//get all friends
router.get("/friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const friends = await Promise.all(
      user.friends.map((friendId) => {
        return User.findById(friendId);
      })
    );
    
    const friendList = [];
    friends.map((friend) => {
      const { _id, username, profilePicture, email } = friend;
      friendList.push({ _id, username, profilePicture, email });
    });
    res.status(200).send(friendList);

  } catch (err) {
    res.status(400).send({ error: err });
  }
});

router.post("/add-friend/:userId", async (req, res) => {
  const userId = req.params.userId;
  const email = req.body.email;
  let friendList = req.body.friendList;

  if (!userId) {
    res.status(400).send({ message: 'Có lỗi xảy ra'});
  }
  
  const foundUser = await User.findOne({ email: email });
  if (!foundUser) {
    res.status(400).send({ error: "Email không tồn tại!" });
    return;
  }

  // Nếu trong danh sách bạn bè chưa có id của người được kết bạn thì thêm vào friendList
  const user = await User.findById(userId);
  const existedFriend = user.friends.includes(foundUser._id);

  if (!existedFriend) {
    friendList.push(String(foundUser._id));
    let newFriendFriendList = [...foundUser.friends, String(user._id)];
    console.log("newFriendFriendList = ", newFriendFriendList);
    console.log("friendList =", friendList);
    user.friends = friendList;
    const updatedUser = await User.findOneAndUpdate({ _id: userId }, { friends: friendList }, { new: true });
    await User.findOneAndUpdate({ email: email }, { friends: newFriendFriendList }, { new: true });

    // create conversation
    const newConversation = new Conversation({
      members: [String(userId), String(foundUser._id)],
    });

    await newConversation.save();
    res.status(200).send({ message: 'Kết bạn thành công', updatedUser: updatedUser });

  } else {
    res.status(400).send({ error: "Đã kết bạn với người này!" });
  }
  

  // User.findOne({ email: new RegExp(email, "i")}).exec(async (err, values) => {
  //   if (err) {
  //     res.status(400).send({ message: 'Có lỗi xảy ra, vui lòng thử lại sau'});
  //     return;
  //   }

  //   if (!values?._id) {
  //     res.status(400).send({ message: 'Email không tồn tại'});
  //     return;
  //   }

  //   const arrayContainNewFriendId = (friendList.indexOf(String(values?._id)) > -1);

  //   if (arrayContainNewFriendId == false) {
  //     // create conversation
  //     const newConversation = new Conversation({
  //       members: [String(userId), String(values?._id)],
  //     });
  //     await newConversation.save();

  //     // add new friend
  //     friendList.push(String(values?._id));
  //     values.friends.push(String(userId));
  //     const updatedUser1 = await User.findOneAndUpdate({ _id: userId }, { friends: friendList }, { new: true });
  //     const updatedUser2 = await User.findOneAndUpdate({ email: req.body.email }, { friends: values.friends }, { new: true });

  //     Promise.all([updatedUser1, updatedUser2])
  //       .then(values => {
  //         console.log(values);
  //         res.status(200).send({ message: 'Kết bạn thành công', updatedUser: updatedUser1 });
  //       })
  //     return;
  //   } else {
  //     res.status(400).send({ message: 'Đã kết bạn với người này' });
  //     return;
  //   }
  // });

});

//update user
router.put("/password/:id", async (req, res) => {

  const user = await User.findOne({ _id: req.params.id });
  !user && res.status(404).send("Không tìm thất người dùng này!");

  const validPassword = await bcrypt.compare(req.body.oldPassword, user.password);
  !validPassword && res.status(400).json({ error: "Mật khẩu cũ sai!" });

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    user.password = hashedPassword;
    await user.save();
    res.status(200).send('Cập nhật mật khẩu thành công, vui lòng đăng nhập lại');
  } catch (err) {
    res.status(500).json(err);
  }
  
})

router.put("/:id", async (req, res) => {
  // kiểm tra xem id trong url và trong tham số có giống nhau không, có thì mới update
  // kiểm tra xem có phải là admin hay không
  if (req.body._id === req.params.id || req.body.isAdmin) {
    if (req.body.password) {
      try {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
      } catch (err) {
        return res.status(500).json("Mật khẩu không hợp lệ!");
      }
    }

    delete req.body.password;
    delete req.body.friends;
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
      console.log(user);
      res.status(200).json(user);
    } catch (err) {
      return res.status(500).json({ error: "Cập nhật thông tin thất bại" });
    }
  } else {
    return res.status(403).json({ error: "Tài khoản không hợp lệ!" });
  }
});

//delete user
router.delete("/:id", async (req, res) => {
  if (req.body.userId === req.params.id || req.body.isAdmin) {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.status(200).json("Account has been deleted");
    } catch (err) {
      return res.status(500).json(err);
    }
  } else {
    return res.status(403).json("You can delete only your account!");
  }
});

//get a user
router.get("/:id", async (req, res) => {
  const userId = req.params.id;
  // const username = req.query.username;
  console.log('userId ', userId);
  try {
    const user = userId
      ? await User.findById(userId)
      : await User.findOne({ username: username });
    const { password, updatedAt, ...other } = user._doc;
    res.status(200).json(other);
  } catch (err) {
    res.status(500).json(err);
  }
});

//get friends
router.get("/friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const friends = await Promise.all(
      user.followings.map((friendId) => {
        return User.findById(friendId);
      })
    );
    let friendList = [];
    friends.map((friend) => {
      const { _id, username, profilePicture } = friend;
      friendList.push({ _id, username, profilePicture });
    });
    res.status(200).json(friendList)
  } catch (err) {
    res.status(500).json(err);
  }
});

//follow a user

// router.put("/:id/follow", async (req, res) => {
//   if (req.body.userId !== req.params.id) {
//     try {
//       const user = await User.findById(req.params.id);
//       const currentUser = await User.findById(req.body.userId);
//       if (!user.followers.includes(req.body.userId)) {
//         await user.updateOne({ $push: { followers: req.body.userId } });
//         await currentUser.updateOne({ $push: { followings: req.params.id } });
//         res.status(200).json("user has been followed");
//       } else {
//         res.status(403).json("you already follow this user");
//       }
//     } catch (err) {
//       res.status(500).json(err);
//     }
//   } else {
//     res.status(403).json("you can't follow yourself");
//   }
// });

// //unfollow a user

// router.put("/:id/unfollow", async (req, res) => {
//   if (req.body.userId !== req.params.id) {
//     try {
//       const user = await User.findById(req.params.id);
//       const currentUser = await User.findById(req.body.userId);
//       if (user.followers.includes(req.body.userId)) {
//         await user.updateOne({ $pull: { followers: req.body.userId } });
//         await currentUser.updateOne({ $pull: { followings: req.params.id } });
//         res.status(200).json("user has been unfollowed");
//       } else {
//         res.status(403).json("you don't follow this user");
//       }
//     } catch (err) {
//       res.status(500).json(err);
//     }
//   } else {
//     res.status(403).json("you can't unfollow yourself");
//   }
// });

module.exports = router;
