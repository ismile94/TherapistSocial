import  { MessageSquare, Users, Plus } from 'lucide-react';

function Community() {
  const posts = [
    {
      id: 1,
      author: 'Sarah Johnson',
      profession: 'Physiotherapist',
      title: 'Best practices for sports injury rehabilitation',
      content: 'Looking for advice on modern approaches to ACL rehabilitation...',
      replies: 12,
      time: '2 hours ago'
    },
    {
      id: 2,
      author: 'Ahmed Hassan',
      profession: 'Occupational Therapist',
      title: 'Pediatric OT resources in Birmingham area',
      content: 'Does anyone know good resources for sensory integration therapy for children?',
      replies: 8,
      time: '5 hours ago'
    }
  ];

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Feed</h2>
          </div>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </button>
        </div>

        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                  <p className="text-sm text-gray-600">
                    by <span className="font-medium">{post.author}</span> • {post.profession} • {post.time}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{post.content}</p>
              
              <div className="flex items-center text-sm text-gray-500">
                <MessageSquare className="w-4 h-4 mr-1" />
                {post.replies} replies
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Community;
 