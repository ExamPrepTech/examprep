import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, History, PlayCircle, Loader2 } from 'lucide-react';
import { useTestStore } from '@/store/testStore';
import { TestCreationWizard } from '@/components/tests/TestCreationWizard';

const TestDashboard = () => {
    const { tests, isLoading, fetchTests } = useTestStore();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Test Center</h1>
                    <p className="text-foreground/60 mt-2">Manage your practice tests and review your history</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-background hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Create New Test
                </button>
            </div>

            {isLoading && tests.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Previous Tests
                    </h2>
                    
                    {tests.length === 0 ? (
                        <div className="bg-background border rounded-lg p-8 text-center text-foreground/60">
                            You haven't taken any tests yet. Start by creating one!
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {tests.map(test => (
                                <div key={test._id} className="bg-background border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                            test.status === 'COMPLETED' ? 'bg-secondary text-success' :
                                            test.status === 'IN_PROGRESS' ? 'bg-secondary text-primary' :
                                            'bg-secondary text-foreground/70'
                                        }`}>
                                            {test.status.replace('_', ' ')}
                                        </div>
                                        <span className="text-sm text-foreground/60">{test.createdAt ? formatDate(test.createdAt) : ''}</span>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <div className="text-2xl font-bold">
                                            {test.status === 'COMPLETED' ? `${test.score}/${test.totalMarks}` : '--'}
                                        </div>
                                        <div className="text-sm text-foreground/60">Score</div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">{test.config?.questionCount || 0} Questions</span>
                                        {test.status !== 'COMPLETED' && (
                                            <button 
                                                onClick={() => navigate(`/tests/${test._id}`)}
                                                className="text-primary hover:underline flex items-center gap-1 text-sm font-semibold"
                                            >
                                                Resume <PlayCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {test.status === 'COMPLETED' && (
                                            <button 
                                                onClick={() => navigate(`/tests/${test._id}`)}
                                                className="text-foreground/60 hover:text-foreground text-sm"
                                            >
                                                View Results
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <TestCreationWizard
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default TestDashboard;
