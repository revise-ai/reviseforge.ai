const Badge = () => {
  return (
    <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
      {/* Stacked avatars */}
      <div className="flex -space-x-2">
        <img
          src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200"
          alt="user"
          className="w-7 h-7 rounded-full border-2 border-white object-cover"
        />
        <img
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200"
          alt="user"
          className="w-7 h-7 rounded-full border-2 border-white object-cover"
        />
        <img
          src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&auto=format&fit=crop"
          alt="user"
          className="w-7 h-7 rounded-full border-2 border-white object-cover"
        />
        <img
          src="https://randomuser.me/api/portraits/men/75.jpg"
          alt="user"
          className="w-7 h-7 rounded-full border-2 border-white object-cover"
        />
      </div>

      {/* Text */}
      <p className="text-sm text-gray-600 font-medium">
        Trusted by <span className="text-gray-900 font-semibold">100,000+</span> students
      </p>
    </div>
  );
};

export default Badge;