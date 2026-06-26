// Business logic handlers
export const testHandler = async (req, res) => {
  try {
    res.json({ message: "Controller logic successfully invoked." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
