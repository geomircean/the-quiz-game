'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';

const AdminLanding = ({}) => {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col flex-wrap items-center justify-around gap-1">
      <div className="flex flex-row gap-5 justify-evenly">
        <Button onClick={() => router.push('/new-quiz')}>Configure New Quiz</Button>
        <Button disabled onClick={() => router.push('/new-random-quiz')}>Generate Random Quiz</Button>
      </div>
      <div className="flex flex-row gap-2">
        <Button> Add Question To Your Database</Button>
        <Button onClick={() => router.push('/questions-list')}>View Questions List</Button>
      </div>
      <div>
        <h3>Existing Quizzes</h3>
        {/*TODO: render list of existing quizzes with the possibility to launch the quiz*/}
        {/*<button onClick={() => router.push('/new-quiz')}>Create game room</button>*/}
      </div>
    </div>
  );
};
export default AdminLanding;
