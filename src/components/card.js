const Card = ({ title, children, className, onClick }) => {
  return (
    <a onClick={onClick} className={`group relative block h-60 basis-1/5 cursor-pointer ${className}`}>
      <span className="absolute inset-0 border-2 border-dashed border-white"></span>

      <div
        className="relative flex h-full transform items-end border-2 border-white bg-inherit transition-transform group-hover:-translate-x-2 group-hover:-translate-y-2"
      >
        <div
          className="p-4 !pt-0 transition-opacity group-hover:absolute group-hover:opacity-0 sm:p-6 lg:p-8"
        >
          <h2 className="mt-4 text-xl font-medium sm:text-2xl">{title}</h2>
        </div>

        <div
          className="absolute p-4 opacity-0 transition-opacity group-hover:relative group-hover:opacity-100 sm:p-6 lg:p-8"
        >
          <h3 className="mt-4 text-xl font-medium sm:text-2xl">{title}</h3>

          <p className="mt-4 text-sm sm:text-base">
            {children}
          </p>

        </div>
      </div>
    </a>
  )
};

export default Card;
