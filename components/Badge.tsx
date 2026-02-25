const Badge = () => {
  return (
    <div className="flex items-center divide-x divide-gray-300">
      <div className="flex -space-x-3 pr-3">
        <img
          src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200"
          alt="image"
          className="w-8 h-8 rounded-full border-2 border-white hover:-translate-y-1 transition z-1 hover:z-10"
        />
        <img
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200"
          alt="image"
          className="w-8 h-8 rounded-full border-2 border-white hover:-translate-y-1 transition z-2 hover:z-10"
        />
        <img
          src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&auto=format&fit=crop"
          alt="image"
          className="w-8 h-8 rounded-full border-2 border-white hover:-translate-y-1 transition z-3 hover:z-10"
        />
        <img
          src="https://randomuser.me/api/portraits/men/75.jpg"
          alt="image"
          className="w-8 h-8 rounded-full border-2 border-white hover:-translate-y-1 transition z-4 hover:z-10"
        />
      </div>
      <div className="pl-3">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="#FACC15"
            stroke="#FACC15"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="#FACC15"
            stroke="#FACC15"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="#FACC15"
            stroke="#FACC15"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="#FACC15"
            stroke="#FACC15"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="#FACC15"
            stroke="#FACC15"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
          </svg>
          <p className="text-gray-600 font-medium ml-2">5.0</p>
        </div>
        <p className="text-sm text-gray-500">
          Trusted by <span className="font-medium text-gray-800">100,000+</span>{" "}
          users
        </p>
      </div>
    </div>
  );
};

export default Badge;
